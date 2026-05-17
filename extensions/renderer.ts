export interface BudgetData {
  systemPrompt: { tokens: number; chars?: number; items?: Array<{ name: string; chars: number }> };
  skills: { tokens: number; chars?: number; items?: Array<{ name: string; chars: number }> };
  tools: { tokens: number; chars?: number; items?: Array<{ name: string; chars: number }> };
  conversation: { tokens: number };
  freeTokens: number;
  contextWindow?: number;
  model?: string;
}

export function formatBudget(data: BudgetData): string {
  const contextWindow = data.contextWindow ?? 0;
  const pct = (tokens: number) =>
    contextWindow > 0 ? ((tokens / contextWindow) * 100).toFixed(1) : "0.0";
  const fmt = (tokens: number) => tokens.toLocaleString();

  // Split system into AGENTS.md vs other
  const agentsItems = (data.systemPrompt.items ?? []).filter((i) =>
    /AGENTS\.md$/i.test(i.name)
  );
  const otherSystemItems = (data.systemPrompt.items ?? []).filter(
    (i) => !/AGENTS\.md$/i.test(i.name)
  );

  const agentsTokens = agentsItems.reduce((s, i) => s + Math.ceil(i.chars / 4), 0);
  const otherSystemTokens = otherSystemItems.reduce((s, i) => s + Math.ceil(i.chars / 4), 0);
  // Internal pi prompt = total systemPrompt - contextFiles
  const internalTokens = Math.max(0, data.systemPrompt.tokens - agentsTokens - otherSystemTokens);

  // Split tools into Tools+MCP vs Builtin
  const toolItems = data.tools.items ?? [];
  // Note: items only have name+chars in BudgetData, no source info here
  // Tools/MCP/Builtin split is shown in verbose mode via breakdown

  const lines: string[] = [];
  lines.push("╭─ Context Budget");
  lines.push(`│`);
  lines.push(`├─ System ─── ${fmt(data.systemPrompt.tokens)} tokens (${pct(data.systemPrompt.tokens)}%)`);
  lines.push(`│  ├─ Internal pi prompt: ${fmt(internalTokens)} tokens (${pct(internalTokens)}%)`);
  lines.push(`│  ├─ AGENTS.md (project): ${fmt(agentsTokens)} tokens (${pct(agentsTokens)}%)`);
  for (const item of agentsItems) {
    const t = Math.ceil(item.chars / 4);
    lines.push(`│  │  └─ ${item.name}: ${fmt(t)} tokens`);
  }
  lines.push(`│  └─ Other context files: ${fmt(otherSystemTokens)} tokens (${pct(otherSystemTokens)}%)`);
  for (const item of otherSystemItems) {
    const t = Math.ceil(item.chars / 4);
    lines.push(`│     └─ ${item.name}: ${fmt(t)} tokens`);
  }
  lines.push(`│`);
  lines.push(`├─ Skills ─── ${fmt(data.skills.tokens)} tokens (${pct(data.skills.tokens)}%)`);
  for (const item of data.skills.items ?? []) {
    const t = Math.ceil(item.chars / 4);
    lines.push(`│  └─ ${item.name}: ${fmt(t)} tokens`);
  }
  lines.push(`│`);
  lines.push(`├─ Tools ─── ${fmt(data.tools.tokens)} tokens (${pct(data.tools.tokens)}%)`);
  for (const item of toolItems) {
    const t = Math.ceil(item.chars / 4);
    lines.push(`│  └─ ${item.name}: ${fmt(t)} tokens`);
  }
  lines.push(`│`);
  lines.push(`├─ Conversation ─ ${fmt(data.conversation.tokens)} tokens (${pct(data.conversation.tokens)}%)`);
  lines.push(`├─ Free ────── ${fmt(data.freeTokens)} tokens (${pct(data.freeTokens)}%)`);
  lines.push(`╰─ Window: ${fmt(contextWindow)} tokens · ${data.model ?? "unknown"}`);

  return lines.join("\n");
}
