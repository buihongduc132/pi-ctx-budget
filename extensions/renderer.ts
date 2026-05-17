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
  const getPct = (tokens: number) => (contextWindow > 0 ? (tokens / contextWindow) * 100 : 0).toFixed(1);
  const fmt = (tokens: number) => tokens.toLocaleString();

  const lines: string[] = [];
  lines.push("╭─ Context Budget");
  lines.push(`├─ System Prompt: ${fmt(data.systemPrompt.tokens)} tokens (${getPct(data.systemPrompt.tokens)}%)`);
  lines.push(`├─ Skills:        ${fmt(data.skills.tokens)} tokens (${getPct(data.skills.tokens)}%)`);
  lines.push(`├─ Tools:         ${fmt(data.tools.tokens)} tokens (${getPct(data.tools.tokens)}%)`);
  lines.push(`├─ Conversation:  ${fmt(data.conversation.tokens)} tokens (${getPct(data.conversation.tokens)}%)`);
  lines.push(`├─ Free:          ${fmt(data.freeTokens)} tokens (${getPct(data.freeTokens)}%)`);
  lines.push(`└─ Window: ${fmt(contextWindow)} tokens`);
  lines.push(`╯ Model: ${data.model ?? "unknown"}`);

  return lines.join("\n");
}
