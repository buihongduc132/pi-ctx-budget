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

/** Short codes for compact footer — 1-2 chars max */
export const SHORT_LABELS: Record<FooterCategory, string> = {
  agents: "A",
  system: "Sy",
  skills: "Sk",
  guidelines: "G",
  tools: "T",
  mcp: "M",
  builtin: "B",
  conversation: "C",
  free: "F"
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
  const segments: string[] = [];

  for (const category of FOOTER_CATEGORIES) {
    if (!state.categories[category]) continue;
    const tokens = data.categories[category]?.tokens;
    if (tokens == null) continue;

    const code = SHORT_LABELS[category];
    const pct = (tokens / window) * 100;
    segments.push(`${code}${pct.toFixed(1)}`);
  }

  if (segments.length === 0) return "";

  // Compute used% = everything except Free
  const usedTokens = FOOTER_CATEGORIES
    .filter((c) => c !== "free")
    .reduce((sum, c) => sum + (data.categories[c]?.tokens ?? 0), 0);
  const usedPct = window > 0 ? ((usedTokens / window) * 100).toFixed(1) : "0.0";
  const windowK = data.contextWindow ? `${(data.contextWindow / 1000).toFixed(0)}K` : "?";

  const suffix = data.model ? ` ${data.model}` : "";
  return `${segments.join("|")} ${usedPct}%/${windowK}${suffix}`;
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
