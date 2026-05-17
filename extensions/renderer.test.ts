import { describe, expect, it } from "vitest";
import { formatBudget, type BudgetData } from "./renderer";

describe("formatBudget", () => {
  const baseData: BudgetData = {
    systemPrompt: {
      tokens: 3000,
      chars: 12000,
      items: [
        { name: "/path/AGENTS.md", chars: 4000 },
        { name: "/path/guidelines.md", chars: 2000 }
      ]
    },
    skills: { tokens: 500, chars: 2000, items: [{ name: "my-skill", chars: 2000 }] },
    tools: { tokens: 800, chars: 3200, items: [{ name: "Extension", chars: 2000 }, { name: "MCP", chars: 1200 }] },
    conversation: { tokens: 5000 },
    freeTokens: 700,
    contextWindow: 10000,
    model: "claude-sonnet-4"
  };

  it("renders tree with System/Skills/Tools/Conversation/Free", () => {
    const output = formatBudget(baseData);
    expect(output).toContain("╭─ Context Budget");
    expect(output).toContain("├─ System");
    expect(output).toContain("Internal pi prompt");
    expect(output).toContain("AGENTS.md (project)");
    expect(output).toContain("├─ Skills");
    expect(output).toContain("├─ Tools");
    expect(output).toContain("├─ Conversation");
    expect(output).toContain("├─ Free");
    expect(output).toContain("claude-sonnet-4");
  });

  it("splits AGENTS.md from other system files", () => {
    const output = formatBudget(baseData);
    expect(output).toContain("/path/AGENTS.md");
    expect(output).toContain("/path/guidelines.md");
  });

  it("shows percentages", () => {
    const output = formatBudget(baseData);
    // systemPrompt: 3000/10000 = 30%
    expect(output).toContain("30.0%");
  });

  it("handles missing model and context window", () => {
    const data: BudgetData = {
      ...baseData,
      model: undefined,
      contextWindow: undefined
    };
    const output = formatBudget(data);
    expect(output).toContain("unknown");
    expect(output).toContain("0.0%");
  });

  it("renders with empty categories", () => {
    const data: BudgetData = {
      systemPrompt: { tokens: 0, chars: 0, items: [] },
      skills: { tokens: 0, chars: 0, items: [] },
      tools: { tokens: 0, chars: 0, items: [] },
      conversation: { tokens: 0 },
      freeTokens: 0,
      contextWindow: 0
    };
    const output = formatBudget(data);
    expect(output).toContain("0");
    expect(output).toContain("0.0%");
    expect(output).toContain("╰");
  });
});
