/**
 * POST /api/ai/chat — the assistant proxy. Streams the model reply as SSE.
 * Body: { system: string, messages: {role, content}[] }
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { streamCompletion, verifyUser, type ChatTurn } from "../_lib/proxy.js";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
  headers: IncomingMessage["headers"];
}
interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

async function readBody(req: VercelRequest): Promise<{ system?: string; messages?: ChatTurn[] }> {
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

  const { system, messages } = await readBody(req);
  if (!system || !Array.isArray(messages)) return res.status(400).json({ error: "bad request" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    for await (const delta of streamCompletion({ system, messages, maxTokens: 1000 })) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
  } finally {
    res.end();
  }
}
