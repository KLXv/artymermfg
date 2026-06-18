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
