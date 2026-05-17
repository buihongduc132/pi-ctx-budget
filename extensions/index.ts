import type { BuildSystemPromptOptions, ExtensionAPI, ExtensionContext, ToolInfo } from "@mariozechner/pi-coding-agent";

import { computeBreakdown, type Breakdown, type SourceInput } from "./estimator";
import {
  CATEGORY_LABELS,
  FOOTER_CATEGORIES,
  formatFooter,
  parseFooterArgs,
  type FooterCategory,
  type FooterData,
  type FooterState,
} from "./footer";
import { formatBudget, type BudgetData } from "./renderer";

let cachedBreakdown: Breakdown | null = null;
let lastUsageTokens = 0;
let lastContextWindow = 0;
let lastModel = "unknown";
let lastCtx: ExtensionContext | null = null;

const footerState: FooterState = {
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
    free: true,
  },
};

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", (event, ctx) => {
    void Promise.resolve()
      .then(() => {
        lastCtx = ctx;
        const sourceInput = buildSourceInput(event.systemPrompt, event.systemPromptOptions, pi.getAllTools());
        cachedBreakdown = computeBreakdown(sourceInput);
        lastModel = ctx.model?.id ?? "unknown";
      })
      .catch(() => {});
  });

  const refreshFromUsage = (ctx: ExtensionContext) => {
    void Promise.resolve()
      .then(() => {
        lastCtx = ctx;
        const usage = ctx.getContextUsage();
        if (usage?.tokens != null) {
          lastUsageTokens = usage.tokens;
          lastContextWindow = usage.contextWindow;
        }
        lastModel = ctx.model?.id ?? lastModel;
        applyFooter(ctx);
      })
      .catch(() => {});
  };

  pi.on("after_provider_response", (_event, ctx) => refreshFromUsage(ctx));
  pi.on("message_end", (_event, ctx) => refreshFromUsage(ctx));

  pi.registerCommand("ctx-budget", {
    description: "Show context usage budget and manage footer",
    handler: async (args, ctx) => {
      lastCtx = ctx;
      const trimmed = args.trim();

      if (trimmed.startsWith("footer")) {
        const footerArgs = trimmed.slice("footer".length).trim();
        const parsed = parseFooterArgs(footerArgs);
        if (parsed.action === "set") {
          footerState.enabled = parsed.enabled;
          applyFooter(ctx);
          ctx.ui.notify(`ctx-budget footer ${parsed.enabled ? "enabled" : "disabled"}`, "info");
          return;
        }
        if (parsed.action === "toggle") {
          footerState.categories[parsed.category] = !footerState.categories[parsed.category];
          applyFooter(ctx);
          ctx.ui.notify(
            `ctx-budget footer ${parsed.category}: ${footerState.categories[parsed.category] ? "on" : "off"}`,
            "info",
          );
          return;
        }
        if (parsed.action === "status") {
          const enabled = FOOTER_CATEGORIES.filter((k) => footerState.categories[k]).join(", ") || "none";
          ctx.ui.notify(`footer ${footerState.enabled ? "on" : "off"}; categories: ${enabled}`, "info");
          return;
        }
        ctx.ui.notify("unknown footer arg. Use: on|off|agents|system|skills|guidelines|tools|mcp|builtin|conversation|free", "warning");
        return;
      }

      const verbose = trimmed === "all" || trimmed === "--verbose";
      const budget = buildBudgetData();
      const table = formatBudget(budget);
      const details = verbose && cachedBreakdown ? formatVerbose(cachedBreakdown) : "";
      ctx.ui.notify(`${table}${details}`, "info");
    },
  });
}

function buildSourceInput(systemPrompt: string, options: BuildSystemPromptOptions, tools: ToolInfo[]): SourceInput {
  const selected = new Set(options.selectedTools ?? tools.map((t) => t.name));
  const selectedTools = tools.filter((tool) => selected.has(tool.name));

  return {
    systemPrompt,
    contextFiles: (options.contextFiles ?? []).map((file) => ({
      name: file.path,
      content: file.content,
    })),
    skills: (options.skills ?? []).map((skill) => ({
      name: skill.name,
      // BuildSystemPromptOptions does not expose full skill content.
      content: `${skill.name}\n${skill.description ?? ""}`,
    })),
    tools: selectedTools.map((tool) => ({
      name: tool.name,
      source: tool.sourceInfo.source,
      schema: safeStringify(tool.parameters),
    })),
  };
}

function buildBudgetData(): BudgetData {
  const breakdown = cachedBreakdown;
  const contextWindow = lastContextWindow;
  const sourceTokens = breakdown?.totalSourceTokens ?? 0;
  const conversationTokens = Math.max(0, lastUsageTokens - sourceTokens);
  const freeTokens = Math.max(0, contextWindow - lastUsageTokens);

  return {
    systemPrompt: {
      tokens: breakdown?.systemPrompt.tokens ?? 0,
      chars: breakdown?.systemPrompt.chars,
      items: breakdown?.systemPrompt.items,
    },
    skills: {
      tokens: breakdown?.skills.tokens ?? 0,
      chars: breakdown?.skills.chars,
      items: breakdown?.skills.items,
    },
    tools: {
      tokens: breakdown?.tools.tokens ?? 0,
      chars: breakdown?.tools.chars,
      items: breakdown?.tools.items.map((item) => ({ name: item.name, chars: item.chars })) ?? [],
    },
    conversation: { tokens: conversationTokens },
    freeTokens,
    contextWindow,
    model: lastModel,
  };
}

function buildFooterData(): FooterData {
  const breakdown = cachedBreakdown;
  const budget = buildBudgetData();

  const contextItems = breakdown?.systemPrompt.items ?? [];
  const agentsChars = contextItems
    .filter((item) => item.name.toLowerCase().includes("agents.md"))
    .reduce((sum, item) => sum + item.chars, 0);
  const guidelinesChars = contextItems
    .filter((item) => !item.name.toLowerCase().includes("agents.md"))
    .reduce((sum, item) => sum + item.chars, 0);

  const mcpTokens =
    breakdown?.tools.items
      .filter((item) => item.name.toLowerCase() === "mcp")
      .reduce((sum, item) => sum + item.tokens, 0) ?? 0;
  const builtinTokens =
    breakdown?.tools.items
      .filter((item) => item.name.toLowerCase() === "builtin")
      .reduce((sum, item) => sum + item.tokens, 0) ?? 0;

  return {
    model: budget.model,
    contextWindow: budget.contextWindow,
    categories: {
      agents: { tokens: Math.ceil(agentsChars / 4) },
      system: { tokens: budget.systemPrompt.tokens },
      skills: { tokens: budget.skills.tokens },
      guidelines: { tokens: Math.ceil(guidelinesChars / 4) },
      tools: { tokens: budget.tools.tokens },
      mcp: { tokens: mcpTokens },
      builtin: { tokens: builtinTokens },
      conversation: { tokens: budget.conversation.tokens },
      free: { tokens: budget.freeTokens },
    },
  };
}

function applyFooter(ctx: ExtensionContext): void {
  if (!footerState.enabled) {
    ctx.ui.setFooter(undefined);
    return;
  }

  ctx.ui.setFooter(() => ({
    invalidate() {},
    render(width: number) {
      const line = formatFooter(buildFooterData(), footerState);
      if (!line) return [""];
      return [line.length > width ? line.slice(0, width) : line];
    },
  }));
}

function formatVerbose(breakdown: Breakdown): string {
  const parts: string[] = [];

  const list = (title: string, items: Array<{ name: string; chars: number }>) => {
    if (items.length === 0) return;
    parts.push(`\n${title}:`);
    for (const item of items) parts.push(`- ${item.name}: ${Math.ceil(item.chars / 4)} tokens`);
  };

  list("System files", breakdown.systemPrompt.items);
  list("Skills", breakdown.skills.items);

  if (breakdown.tools.items.length > 0) {
    parts.push("\nTool sources:");
    for (const item of breakdown.tools.items) {
      parts.push(`- ${item.name}: ${item.tokens} tokens (${item.count} tools)`);
    }
  }

  return parts.join("\n");
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

export function _getDebugState() {
  return {
    breakdown: cachedBreakdown,
    footerState,
    usage: lastUsageTokens,
    model: lastModel,
    contextWindow: lastContextWindow,
    hasCtx: Boolean(lastCtx),
    labels: CATEGORY_LABELS,
  };
}
