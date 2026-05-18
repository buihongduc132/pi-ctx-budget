import { computeBreakdown } from "../extensions/estimator.ts";
import { formatBudget } from "../extensions/renderer.ts";
import { parseFooterArgs } from "../extensions/footer.ts";

function main(): void {
  const breakdown = computeBreakdown({
    systemPrompt: "system prompt",
    contextFiles: [{ name: "AGENTS.md", content: "rules" }],
    skills: [{ name: "pi-ctx-budget", content: "skill body" }],
    tools: [{ name: "ctx-budget", source: "builtin", schema: "{}" }]
  });

  const budgetText = formatBudget({
    systemPrompt: { tokens: breakdown.systemPrompt.tokens },
    skills: { tokens: breakdown.skills.tokens },
    tools: { tokens: breakdown.tools.tokens },
    conversation: { tokens: 42 },
    freeTokens: 1000,
    contextWindow: 4096,
    model: "smoke-test-model"
  });

  const parsed = parseFooterArgs("on");
  if (!budgetText.includes("Context Budget")) throw new Error("renderer smoke failed");
  if (parsed.action !== "set" || parsed.enabled !== true) throw new Error("parse smoke failed");

  console.log("smoke-test: ok (estimator, renderer, footer loaded)");
}

main();
