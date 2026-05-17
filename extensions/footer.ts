export type FooterCategory =
  | "agents"
  | "system"
  | "skills"
  | "guidelines"
  | "tools"
  | "mcp"
  | "builtin"
  | "conversation"
  | "free";

export const FOOTER_CATEGORIES: FooterCategory[] = [
  "agents",
  "system",
  "skills",
  "guidelines",
  "tools",
  "mcp",
  "builtin",
  "conversation",
  "free"
];

export const CATEGORY_LABELS: Record<FooterCategory, string> = {
  agents: "AGENTS",
  system: "System",
  skills: "Skills",
  guidelines: "Guide",
  tools: "Tools",
  mcp: "MCP",
  builtin: "Core",
  conversation: "Chat",
  free: "Free"
};

export interface FooterData {
  model?: string;
  contextWindow?: number;
  categories: Partial<Record<FooterCategory, { tokens: number }>>;
}

export interface FooterState {
  enabled: boolean;
  categories: Record<FooterCategory, boolean>;
}

export function formatFooter(data: FooterData, state: FooterState): string {
  if (!state.enabled) return "";

  const window = data.contextWindow ?? 1;
  const parts: string[] = [];

  for (const category of FOOTER_CATEGORIES) {
    if (!state.categories[category]) continue;
    const tokens = data.categories[category]?.tokens;
    if (tokens == null) continue;

    const label = CATEGORY_LABELS[category];
    const pct = tokens / window;
    const barLen = Math.max(1, Math.round(pct * 12));
    const clampedBarLen = Math.min(12, barLen);
    const bar = "█".repeat(clampedBarLen) + "░".repeat(12 - clampedBarLen);
    const fmt = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : `${tokens}`;
    parts.push(`${label}:${fmt}${bar}${(pct * 100).toFixed(1)}%`);
  }

  if (parts.length === 0) return "";

  const modelParts: string[] = [];
  if (data.model) modelParts.push(data.model);
  if (data.contextWindow) modelParts.push(`${(data.contextWindow / 1000).toFixed(0)}K`);
  const suffix = modelParts.length > 0 ? ` · ${modelParts.join(" ")}` : "";
  return `[${parts.join("] [")}]${suffix}`;
}

export type ParseResult =
  | { action: "set"; enabled: boolean }
  | { action: "toggle"; category: FooterCategory }
  | { action: "status" }
  | { action: "unknown" };

export function parseFooterArgs(input: string): ParseResult {
  const arg = input.trim().toLowerCase();
  if (!arg) return { action: "status" };
  if (arg === "on") return { action: "set", enabled: true };
  if (arg === "off") return { action: "set", enabled: false };
  if ((FOOTER_CATEGORIES as string[]).includes(arg)) {
    return { action: "toggle", category: arg as FooterCategory };
  }
  return { action: "unknown" };
}
