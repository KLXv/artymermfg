/**
 * Shared Anthropic proxy core. Holds the API key server-side and never exposes
 * it to the browser. Verifies the caller's Supabase session before proxying so
 * the endpoint is not an open relay. Streams the model response back as
 * Server-Sent Events.
 *
 * This is the secure pattern that replaces the artifact-sandbox direct call:
 * the client talks to /api/ai/*, this talks to Anthropic.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProxyRequest {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}

/** Verify the bearer token against Supabase; returns the user id or null. */
export async function verifyUser(authHeader: string | undefined): Promise<string | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const supabase = createClient(url, anon);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** A streaming Anthropic call, yielding text deltas. */
export async function* streamCompletion(req: ProxyRequest): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: req.maxTokens ?? 1000,
    system: req.system,
    messages: req.messages,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

/** A non-streaming Anthropic call, returning the full joined text. */
export async function completion(req: ProxyRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: req.maxTokens ?? 1000,
    system: req.system,
    messages: req.messages,
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * A grounded, web-searching call for the Discovery Agent. Adds Anthropic's
 * server-side web_search tool so the model verifies signals against live
 * sources. Server tools run on Anthropic's side; a long search turn can stop
 * with `stop_reason: "pause_turn"`, which we resume by re-sending until the
 * model finishes (bounded so a runaway loop can't hang the function).
 *
 * Returns only the model's own text blocks (the fenced candidate JSON lives
 * there); web_search_tool_result blocks are left for the model to synthesize.
 */
export async function research(req: ProxyRequest & { maxSearches?: number }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey });

  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: req.maxSearches ?? 8 }];
  let messages = [...req.messages];
  let text = "";

  // Resume across pause_turn up to a hard cap (each turn may run several searches).
  for (let hop = 0; hop < 6; hop++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages,
      tools: tools as never,
    });
    text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    // `pause_turn` is a server-tool stop reason; the pinned SDK (0.32.x) predates
    // it in its union, so compare as a plain string rather than narrowing.
    if ((res.stop_reason as string | null) !== "pause_turn") break;
    // Re-send with the paused assistant turn appended so the server resumes.
    messages = [...messages, { role: "assistant", content: res.content as never }];
  }
  return text;
}
