import { describe, expect, it } from "vitest";
import { charsToTokens, computeBreakdown } from "./estimator";

describe("charsToTokens", () => {
  it("divides chars by 4", () => {
    expect(charsToTokens(400)).toBe(100);
    expect(charsToTokens(0)).toBe(0);
  });

  it("rounds up for remainders", () => {
    expect(charsToTokens(401)).toBe(101);
    expect(charsToTokens(1)).toBe(1);
  });
});

describe("computeBreakdown", () => {
  it("returns zero breakdown when no sources", () => {
    const result = computeBreakdown({ systemPrompt: "", contextFiles: [], skills: [], tools: [] });
    expect(result.systemPrompt.chars).toBe(0);
    expect(result.systemPrompt.items).toEqual([]);
    expect(result.skills.chars).toBe(0);
    expect(result.tools.items).toHaveLength(0);
  });

  it("counts context files individually", () => {
    const result = computeBreakdown({
      systemPrompt: "full prompt",
      contextFiles: [
        { name: "AGENTS.md", content: "line1\nline2\nline3" },
        { name: "PROJECT.md", content: "project info" }
      ],
      skills: [],
      tools: []
    });
    expect(result.systemPrompt.items).toHaveLength(2);
    expect(result.systemPrompt.items[0].name).toBe("AGENTS.md");
    expect(result.systemPrompt.items[0].chars).toBe("line1\nline2\nline3".length);
    expect(result.systemPrompt.chars).toBe("line1\nline2\nline3".length + "project info".length);
  });

  it("counts skill chars", () => {
    const result = computeBreakdown({
      systemPrompt: "",
      contextFiles: [],
      skills: [
        { name: "brainstorming", content: "# Brainstorming\nUse this when..." },
        { name: "tdd", content: "# TDD\nRed green refactor" }
      ],
      tools: []
    });
    expect(result.skills.items).toHaveLength(2);
    expect(result.skills.chars).toBe(
      "# Brainstorming\nUse this when...".length + "# TDD\nRed green refactor".length
    );
  });

  it("groups tools by source", () => {
    const result = computeBreakdown({
      systemPrompt: "",
      contextFiles: [],
      skills: [],
      tools: [
        { name: "read", source: "builtin", schema: '{"name":"read"}' },
        { name: "bash", source: "builtin", schema: '{"name":"bash"}' },
        { name: "mcp_search", source: "mcp", schema: '{"name":"mcp_search","params":{}}' },
        { name: "ext_foo", source: "extension", schema: '{"name":"ext_foo"}' }
      ]
    });
    expect(result.tools.items).toHaveLength(3);
    const builtin = result.tools.items.find((g) => g.name === "Builtin");
    expect(builtin?.count).toBe(2);
    const mcp = result.tools.items.find((g) => g.name === "MCP");
    expect(mcp?.count).toBe(1);
  });

  it("computes totalSourceChars from contextFiles + skills + tools", () => {
    const result = computeBreakdown({
      systemPrompt: "x".repeat(100),
      contextFiles: [{ name: "AGENTS.md", content: "z".repeat(80) }],
      skills: [{ name: "s1", content: "y".repeat(50) }],
      tools: [{ name: "t1", source: "builtin", schema: '{"name":"t1"}' }]
    });
    // totalSourceChars = contextFiles + skills + tools (NOT systemPrompt)
    expect(result.totalSourceChars).toBe(80 + 50 + '{"name":"t1"}'.length);
  });

  it("exposes per-category tokens via charsToTokens", () => {
    const result = computeBreakdown({
      systemPrompt: "",
      contextFiles: [{ name: "AGENTS.md", content: "A".repeat(4000) }],
      skills: [],
      tools: []
    });
    expect(result.systemPrompt.tokens).toBe(1000);
  });
});
