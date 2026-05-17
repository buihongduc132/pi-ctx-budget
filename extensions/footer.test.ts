import { describe, expect, it } from "vitest";
import { parseFooterArgs } from "./footer";

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
