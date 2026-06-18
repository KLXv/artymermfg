import { describe, expect, it } from "vitest";
import { describeAction, operatorSystemPrompt, parseAssistantReply, type OperatorContext } from "./operator";

describe("parseAssistantReply", () => {
  it("extracts a valid actions block and strips it from the prose", () => {
    const text = `Here's what I'd do next.

\`\`\`artymer-actions
{"actions":[{"type":"create_task","title":"Send the proposal","ref":"P1","due":"2026-07-01"},{"type":"log_contact","ref":"A2"}]}
\`\`\``;
    const { prose, actions } = parseAssistantReply(text);
    expect(prose).toBe("Here's what I'd do next.");
    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({ type: "create_task", title: "Send the proposal", ref: "P1", due: "2026-07-01" });
    expect(actions[1]).toEqual({ type: "log_contact", ref: "A2" });
  });

  it("also accepts a json-tagged fence", () => {
    const text = "ok\n```json\n{\"actions\":[{\"type\":\"advance_stage\",\"ref\":\"P3\"}]}\n```";
    const { actions } = parseAssistantReply(text);
    expect(actions).toEqual([{ type: "advance_stage", ref: "P3" }]);
  });

  it("drops malformed actions but keeps valid ones", () => {
    const text = `x
\`\`\`artymer-actions
{"actions":[{"type":"set_price","ref":"P1"},{"type":"set_price","ref":"P1","unitPrice":"180"},{"type":"bogus"}]}
\`\`\``;
    const { actions } = parseAssistantReply(text);
    expect(actions).toEqual([{ type: "set_price", ref: "P1", unitPrice: "180" }]);
  });

  it("returns no actions and the full text when there is no block", () => {
    const { prose, actions } = parseAssistantReply("Just advice, nothing to do.");
    expect(prose).toBe("Just advice, nothing to do.");
    expect(actions).toEqual([]);
  });

  it("ignores fenced code that isn't an actions object", () => {
    const text = "see:\n```\n{\"foo\":1}\n```";
    const { prose, actions } = parseAssistantReply(text);
    expect(actions).toEqual([]);
    expect(prose).toContain("foo");
  });

  it("caps at four actions", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ type: "log_contact", ref: `A${i}` }));
    const text = "```artymer-actions\n" + JSON.stringify({ actions: many }) + "\n```";
    expect(parseAssistantReply(text).actions).toHaveLength(4);
  });
});

describe("describeAction", () => {
  const nameOf = (h: string) => ({ P1: "Falcon", A2: "LóFő" })[h] ?? h;

  it("labels each action type via the handle resolver", () => {
    expect(describeAction({ type: "advance_stage", ref: "P1" }, nameOf)).toBe("Advance stage · Falcon");
    expect(describeAction({ type: "set_price", ref: "P1", unitPrice: "180" }, nameOf)).toBe("Set unit price → 180 · Falcon");
    expect(describeAction({ type: "log_contact", ref: "A2" }, nameOf)).toBe("Log contact today · LóFő");
    expect(describeAction({ type: "draft", title: "Follow-up — LóFő", body: "..." }, nameOf)).toBe("Draft: Follow-up — LóFő");
  });
});

describe("operatorSystemPrompt", () => {
  const ctx: OperatorContext = {
    snapshot: {
      activeProjects: 2,
      outstanding: 4950,
      expected30: 900,
      leads: 3,
      outreachWk: 1,
      outreachTarget: 25,
      suppliers: 1,
    },
    projects: [
      { handle: "P1", name: "Falcon", client: "HFN", stage: "Won", qty: "30", price: "165", currency: "EUR", owed: 4950, service: "Commission" },
    ],
    clients: [{ handle: "A1", name: "LóFő", status: "active", lastContactDays: 12, nextAction: "Send quote" }],
    today: "2026-06-18",
  };

  it("embeds the handle tables, the protocol, and the hand-assembly rule", () => {
    const p = operatorSystemPrompt(ctx);
    expect(p).toContain("[P1] Falcon");
    expect(p).toContain("[A1] LóFő");
    expect(p).toContain("artymer-actions");
    expect(p).toContain("does NOT hand-assemble"); // inherited from assistantSystemPrompt
    expect(p).toContain("Today is 2026-06-18");
  });
});
