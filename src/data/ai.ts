/**
 * Browser-side AI client. Never holds the Anthropic key — it calls our own
 * serverless proxy (/api/ai/*) with the Supabase session token attached. This
 * replaces the original artifact-sandbox direct fetch to api.anthropic.com.
 */
import { supabase } from "./supabase";
import type { ChatTurn } from "@/domain/types-ai";

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** One-shot grounded generation (dossier story, proposals). Returns text. */
export async function generate(system: string, messages: ChatTurn[], maxTokens = 1000): Promise<string> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) throw new Error(`generate failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

/** Streaming chat. Calls `onDelta` with each text chunk; resolves with the full text. */
export async function chatStream(
  system: string,
  messages: ChatTurn[],
  onDelta: (text: string) => void,
): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok || !res.body) throw new Error(`chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const payload = line.replace(/^data:\s*/, "").trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { delta?: string; error?: string };
        if (evt.error) throw new Error(evt.error);
        if (evt.delta) {
          full += evt.delta;
          onDelta(evt.delta);
        }
      } catch {
        /* ignore malformed keep-alive lines */
      }
    }
  }
  return full;
}
