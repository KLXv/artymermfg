/**
 * POST /api/ai/generate — grounded one-shot drafting (e.g. the dossier story).
 * Non-streaming; returns { text }.
 * Body: { system: string, messages: {role, content}[], maxTokens?: number }
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { completion, verifyUser, type ChatTurn } from "../_lib/proxy.js";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}
interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

async function readBody(
  req: VercelRequest,
): Promise<{ system?: string; messages?: ChatTurn[]; maxTokens?: number }> {
  if (req.body && typeof req.body === "object") return req.body as never;
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const userId = await verifyUser(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { system, messages, maxTokens } = await readBody(req);
  if (!system || !Array.isArray(messages)) return res.status(400).json({ error: "bad request" });

  try {
    const text = await completion({ system, messages, maxTokens });
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
