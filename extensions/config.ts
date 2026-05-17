import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// ── Types ──

export interface CtxBudgetConfig {
  footer: boolean;
}

// ── Defaults ──

export const DEFAULT_CONFIG: CtxBudgetConfig = {
  footer: false,
};

// ── Helpers ──

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T> | null | undefined,
): T {
  if (!override) return base;
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    if (override[key] !== undefined) {
      (result as Record<string, unknown>)[key as string] = override[key];
    }
  }
  return result;
}

function loadJsonLike(path: string): Partial<CtxBudgetConfig> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8").trim());
  } catch {
    return null;
  }
}

function parseBoolEnv(name: string): boolean | null {
  const val = process.env[name];
  if (val === "1" || val === "true") return true;
  if (val === "0" || val === "false") return false;
  return null;
}

// ── ENV layer ──

function applyEnvironmentOverrides(config: CtxBudgetConfig): CtxBudgetConfig {
  const next = { ...config };
  const envFooter = parseBoolEnv("PI_CTX_BUDGET_FOOTER");
  if (envFooter !== null) next.footer = envFooter;
  return next;
}

// ── Public API ──

function getGlobalConfigPath(): string {
  return resolve(homedir(), ".pi", "pi-ctx-budget.json");
}

export const GLOBAL_CONFIG_PATH = getGlobalConfigPath();

export function getProjectConfigPath(cwd: string): string {
  return resolve(cwd, ".pi", "pi-ctx-budget.json");
}

export function readGlobalConfig(): Partial<CtxBudgetConfig> | null {
  return loadJsonLike(getGlobalConfigPath());
}

export function writeGlobalConfig(config: Partial<CtxBudgetConfig>): void {
  const dir = resolve(homedir(), ".pi");
  mkdirSync(dir, { recursive: true });
  writeFileSync(getGlobalConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function mergeConfigLayers(
  globalConfig?: Partial<CtxBudgetConfig> | null,
  projectConfig?: Partial<CtxBudgetConfig> | null,
): CtxBudgetConfig {
  let merged = deepMerge(DEFAULT_CONFIG, globalConfig);
  merged = deepMerge(merged, projectConfig);
  return applyEnvironmentOverrides(merged);
}

export function loadConfig(cwd: string): CtxBudgetConfig {
  return mergeConfigLayers(readGlobalConfig(), loadJsonLike(getProjectConfigPath(cwd)));
}
