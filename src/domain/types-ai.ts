/** Shared AI message shape, used by both the proxy and the browser client. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
