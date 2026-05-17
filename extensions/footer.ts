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
  "free",
];

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
