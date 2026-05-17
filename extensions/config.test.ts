import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  DEFAULT_CONFIG,
  loadConfig,
  readGlobalConfig,
  writeGlobalConfig,
  mergeConfigLayers,
  getProjectConfigPath,
  GLOBAL_CONFIG_PATH,
} from "./config";

describe("config", () => {
  describe("DEFAULT_CONFIG", () => {
    it("has footer: false", () => {
      expect(DEFAULT_CONFIG.footer).toBe(false);
    });
  });

  describe("writeGlobalConfig / readGlobalConfig", () => {
    let testDir: string;
    let origHome: string | undefined;

    beforeEach(() => {
      testDir = resolve(tmpdir(), `ctx-budget-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(resolve(testDir, ".pi"), { recursive: true });
      origHome = process.env.HOME;
      process.env.HOME = testDir;
    });

    afterEach(() => {
      process.env.HOME = origHome;
      rmSync(testDir, { recursive: true, force: true });
    });

    it("returns null when no config file exists", () => {
      // Fresh HOME dir, no config file
      expect(readGlobalConfig()).toBeNull();
    });

    it("round-trips config to disk", () => {
      writeGlobalConfig({ footer: true });
      try {
        const read = readGlobalConfig();
        expect(read).toEqual({ footer: true });
      } finally {
        // Clean up so other tests aren't affected
        try { rmSync(GLOBAL_CONFIG_PATH); } catch {}
      }
    });
  });

  describe("mergeConfigLayers", () => {
    it("applies global over defaults", () => {
      const merged = mergeConfigLayers({ footer: true });
      expect(merged.footer).toBe(true);
    });

    it("applies project over global", () => {
      const merged = mergeConfigLayers({ footer: true }, { footer: false });
      expect(merged.footer).toBe(false);
    });

    it("uses defaults when both null", () => {
      const merged = mergeConfigLayers(null, null);
      expect(merged).toEqual(DEFAULT_CONFIG);
    });
  });

  describe("ENV overrides", () => {
    const envKey = "PI_CTX_BUDGET_FOOTER";
    let orig: string | undefined;

    beforeEach(() => {
      orig = process.env[envKey];
    });

    afterEach(() => {
      if (orig === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = orig;
      }
    });

    it("PI_CTX_BUDGET_FOOTER=true overrides JSON", () => {
      process.env[envKey] = "true";
      const cfg = loadConfig("/tmp/nonexistent");
      expect(cfg.footer).toBe(true);
    });

    it("PI_CTX_BUDGET_FOOTER=0 overrides JSON", () => {
      process.env[envKey] = "0";
      const cfg = mergeConfigLayers({ footer: true }, null);
      expect(cfg.footer).toBe(false);
    });

    it("invalid ENV value falls through to default", () => {
      process.env[envKey] = "maybe";
      const cfg = mergeConfigLayers(null, null);
      expect(cfg.footer).toBe(false);
    });
  });

  describe("getProjectConfigPath", () => {
    it("returns .pi/pi-ctx-budget.json under cwd", () => {
      expect(getProjectConfigPath("/foo/bar")).toBe(
        resolve("/foo/bar/.pi/pi-ctx-budget.json"),
      );
    });
  });
});
