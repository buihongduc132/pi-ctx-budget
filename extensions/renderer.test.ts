import { describe, expect, it } from "vitest";
import { formatBudget, type BudgetData } from "./renderer";

describe("formatBudget", () => {
  const baseData: BudgetData = {
    systemPrompt: { tokens: 1000, chars: 4000, items: [] },
    skills: { tokens: 250, chars: 1000, items: [] },
    tools: { tokens: 500, chars: 2000, items: [] },
    conversation: { tokens: 3000 },
    freeTokens: 5250,
    contextWindow: 10000,
    model: "claude-sonnet-4"
  };

  it("renders an ASCII table with expected categories", () => {
    const output = formatBudget(baseData);
    expect(output).toContain("╭─ Context Budget");
    expect(output).toContain("System Prompt");
    expect(output).toContain("Skills");
    expect(output).toContain("Tools");
    expect(output).toContain("Conversation");
    expect(output).toContain("Free");
    expect(output).toContain("Model: claude-sonnet-4");
  });

  it("shows percentages based on context window", () => {
    const output = formatBudget(baseData);
    expect(output).toContain("10.0%");
    expect(output).toContain("2.5%");
    expect(output).toContain("5.0%");
    expect(output).toContain("30.0%");
    expect(output).toContain("52.5%");
  });

  it("handles missing model and context window", () => {
    const data: BudgetData = {
      ...baseData,
      model: undefined,
      contextWindow: undefined
    };
    const output = formatBudget(data);
    expect(output).toContain("Model: unknown");
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
    expect(output).toContain("╯");
  });

  it("uses correct tree borders: ├─ for middle, └─ for penultimate, ╯ for last", () => {
    const output = formatBudget(baseData);
    const lines = output.split("\n");
    // Lines before last two should use ├─
    expect(lines[1]).toMatch(/^├─/);
    // Penultimate line (Window) should use └─
    expect(lines[lines.length - 2]).toMatch(/^└─/);
    // Last line (Model) should use ╯
    expect(lines[lines.length - 1]).toMatch(/^╯/);
  });
});
