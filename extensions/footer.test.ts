import { describe, expect, it } from "vitest";
import { formatFooter, parseFooterArgs, type FooterData, type FooterState } from "./footer";

describe("formatFooter", () => {
  const baseData: FooterData = {
    model: "claude-sonnet-4",
    contextWindow: 200_000,
    categories: {
      agents: { tokens: 3050 },
      system: { tokens: 7112 },
      skills: { tokens: 2950 },
      guidelines: { tokens: 1112 },
      tools: { tokens: 4550 },
      mcp: { tokens: 3100 },
      builtin: { tokens: 1450 },
      conversation: { tokens: 45000 },
      free: { tokens: 143338 }
    }
  };

  const allOn: FooterState = {
    enabled: true,
    categories: {
      agents: true,
      system: true,
      skills: true,
      guidelines: true,
      tools: true,
      mcp: true,
      builtin: true,
      conversation: true,
      free: true
    }
  };

  it("renders all enabled categories", () => {
    const result = formatFooter(baseData, allOn);
    expect(result).toContain("AGENTS");
    expect(result).toContain("Skills");
    expect(result).toContain("MCP");
    expect(result).toContain("Chat");
    expect(result).toContain("claude-sonnet-4");
  });

  it("skips disabled categories", () => {
    const partial: FooterState = {
      enabled: true,
      categories: {
        agents: true,
        system: false,
        skills: true,
        guidelines: false,
        tools: false,
        mcp: true,
        builtin: false,
        conversation: true,
        free: false
      }
    };
    const result = formatFooter(baseData, partial);
    expect(result).toContain("AGENTS");
    expect(result).toContain("Skills");
    expect(result).toContain("MCP");
    expect(result).not.toContain("Guide:");
    expect(result).not.toContain("Core:");
  });

  it("returns empty when footer disabled", () => {
    const off: FooterState = { enabled: false, categories: allOn.categories };
    const result = formatFooter(baseData, off);
    expect(result).toBe("");
  });

  it("shows proportional bars with padding", () => {
    const result = formatFooter(baseData, allOn);
    const chatSegment = result.match(/Chat:[^\]]+/)?.[0] ?? "";
    const agentsSegment = result.match(/AGENTS:[^\]]+/)?.[0] ?? "";
    const chatBars = (chatSegment.match(/█/g) ?? []).length;
    const agentsBars = (agentsSegment.match(/█/g) ?? []).length;
    expect(chatBars).toBeGreaterThan(agentsBars);
    // Each bar should have ░ padding to fill 12 chars
    expect(result).toContain("░");
  });

  it("includes context window size in footer", () => {
    const result = formatFooter(baseData, allOn);
    expect(result).toContain("200K");
  });
});

describe("parseFooterArgs", () => {
  it("parses 'footer on'", () => {
    expect(parseFooterArgs("on")).toEqual({ action: "set", enabled: true });
  });

  it("parses 'footer off'", () => {
    expect(parseFooterArgs("off")).toEqual({ action: "set", enabled: false });
  });

  it("parses 'footer agents'", () => {
    expect(parseFooterArgs("agents")).toEqual({ action: "toggle", category: "agents" });
  });

  it("parses 'footer mcp'", () => {
    expect(parseFooterArgs("mcp")).toEqual({ action: "toggle", category: "mcp" });
  });

  it("parses 'footer' (no args) as status", () => {
    expect(parseFooterArgs("")).toEqual({ action: "status" });
  });

  it("returns unknown for invalid", () => {
    expect(parseFooterArgs("foobar")).toEqual({ action: "unknown" });
  });
});
