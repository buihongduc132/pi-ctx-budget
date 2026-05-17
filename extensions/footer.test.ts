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

  it("renders all enabled categories as compact pipe-separated", () => {
    const result = formatFooter(baseData, allOn);
    // Short codes: A|Sy|Sk|G|T|M|B|C|F
    expect(result).toContain("A1.5");
    expect(result).toContain("Sy3.6");
    expect(result).toContain("Sk1.5");
    expect(result).toContain("G0.6");
    expect(result).toContain("T2.3");
    expect(result).toContain("M1.6");
    expect(result).toContain("B0.7");
    expect(result).toContain("C22.5");
    expect(result).toContain("F71.7");
    expect(result).toContain("claude-sonnet-4");
    expect(result).toContain("200K");
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
    expect(result).toContain("A1.5");
    expect(result).toContain("Sk1.5");
    expect(result).toContain("M1.6");
    expect(result).toContain("C22.5");
    expect(result).not.toContain("Sy");
    expect(result).not.toContain("G0");
    expect(result).not.toContain("B0");
  });

  it("returns empty when footer disabled", () => {
    const off: FooterState = { enabled: false, categories: allOn.categories };
    const result = formatFooter(baseData, off);
    expect(result).toBe("");
  });

  it("shows used% / windowK format", () => {
    const result = formatFooter(baseData, allOn);
    // used = everything except free
    expect(result).toContain("200K");
    // Should have pipe separators
    expect(result).toContain("|");
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
