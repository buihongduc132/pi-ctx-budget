import type { AssistantMessage } from "@mariozechner/pi-ai";
import type {
  BuildSystemPromptOptions,
  ExtensionAPI,
  ExtensionContext,
  ToolInfo,
} from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

import { computeBreakdown, type Breakdown, type SourceInput } from "./estimator";
import { formatBudget, type BudgetData } from "./renderer";
import {
  loadConfig,
  writeGlobalConfig,
  type CtxBudgetConfig,
} from "./config";

let cachedBreakdown: Breakdown | null = null;
let lastUsageTokens = 0;
let lastContextWindow = 0;
let lastModel = "unknown";
let lastCtx: ExtensionContext | null = null;
let footerEnabled = false;
let configLoaded = false;

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", (event, ctx) => {
    void Promise.resolve()
      .then(() => {
        lastCtx = ctx;

        // Load persisted config on first turn
        if (!configLoaded) {
          configLoaded = true;
          const cfg = loadConfig(ctx.cwd);
          footerEnabled = cfg.footer;
          if (footerEnabled) applyFooter(ctx);
        }

        const sourceInput = buildSourceInput(
          event.systemPrompt,
          event.systemPromptOptions,
          pi.getAllTools()
        );
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
      })
      .catch(() => {});
  };

  pi.on("after_provider_response", (_event, ctx) => refreshFromUsage(ctx));
  pi.on("message_end", (_event, ctx) => refreshFromUsage(ctx));

  pi.registerCommand("ctx-budget", {
    description: "Context window budget display — /ctx-budget [footer|all|detail]",
    handler: async (args, ctx) => {
      lastCtx = ctx;
      const trimmed = args.trim();

      // /ctx-budget footer [on|off]
      if (trimmed.startsWith("footer")) {
        const sub = trimmed.slice("footer".length).trim().toLowerCase();
        if (sub === "on") {
          footerEnabled = true;
          writeGlobalConfig({ footer: true });
          applyFooter(ctx);
          ctx.ui.notify("ctx-budget footer enabled (persisted)", "info");
          return;
        }
        if (sub === "off") {
          footerEnabled = false;
          writeGlobalConfig({ footer: false });
          applyFooter(ctx);
          ctx.ui.notify("ctx-budget footer disabled (persisted)", "info");
          return;
        }
        ctx.ui.notify(
          `footer: ${footerEnabled ? "on" : "off"}. Usage: /ctx-budget footer on|off`,
          "info"
        );
        return;
      }

      // /ctx-budget or /ctx-budget all or /ctx-budget detail
      const verbose = trimmed === "all" || trimmed === "detail" || trimmed === "--verbose";
      const budget = buildBudgetData();
      const table = formatBudget(budget);
      const details = verbose && cachedBreakdown ? formatVerbose(cachedBreakdown) : "";
      ctx.ui.notify(`${table}${details}`, "info");
    },
  });
}

// ── Footer ──────────────────────────────────────────────────────────

function applyFooter(ctx: ExtensionContext): void {
  if (!footerEnabled) {
    ctx.ui.setFooter(undefined); // restore default
    return;
  }

  ctx.ui.setFooter((tui, theme, footerData) => {
    const unsub = footerData.onBranchChange(() => tui.requestRender());

    return {
      dispose: unsub,
      invalidate() {},
      render(width: number): string[] {
        // ── Reproduce built-in footer (2 lines) ──
        const lines: string[] = [];

        // Line 1: pwd + branch
        let pwd = ctx.sessionManager.getCwd();
        const home = process.env.HOME || process.env.USERPROFILE;
        if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
        const branch = footerData.getGitBranch();
        if (branch) pwd = `${pwd} (${branch})`;
        const sessionName = ctx.sessionManager.getSessionName();
        if (sessionName) pwd = `${pwd} • ${sessionName}`;
        lines.push(truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "...")));

        // Line 2: ↑in ↓out Rcache $cost context%/windowK model
        let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCost = 0;
        for (const entry of ctx.sessionManager.getEntries()) {
          if (entry.type === "message" && entry.message.role === "assistant") {
            const m = entry.message as AssistantMessage;
            totalInput += m.usage.input;
            totalOutput += m.usage.output;
            totalCacheRead += m.usage.cacheRead;
            totalCost += m.usage.cost.total;
          }
        }

        const fmt = (n: number) => (n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`);
        const contextUsage = ctx.getContextUsage();
        const contextWindow = contextUsage?.contextWindow ?? 0;
        const contextPct = contextUsage?.percent?.toFixed(1) ?? "?";
        const autoStr = ""; // autoCompact not accessible, skip

        const statsParts: string[] = [];
        if (totalInput) statsParts.push(`↑${fmt(totalInput)}`);
        if (totalOutput) statsParts.push(`↓${fmt(totalOutput)}`);
        if (totalCacheRead) statsParts.push(`R${fmt(totalCacheRead)}`);
        if (totalCost) statsParts.push(`$${totalCost.toFixed(3)}`);

        const ctxPctStr = `${contextPct}%/${fmt(contextWindow)}${autoStr}`;
        statsParts.push(ctxPctStr);

        const modelName = ctx.model?.id ?? "no-model";
        const statsLeft = statsParts.join(" ");
        const statsLeftWidth = visibleWidth(statsLeft);
        const rightSide = modelName;
        const rightWidth = visibleWidth(rightSide);
        const pad = Math.max(2, width - statsLeftWidth - rightWidth);
        const statsLine = statsLeft + " ".repeat(pad > 0 ? Math.min(pad, width - statsLeftWidth - rightWidth) : 2) + rightSide;
        lines.push(truncateToWidth(theme.fg("dim", statsLine), width, theme.fg("dim", "...")));

        // ── Line 3: Budget bar (our addition) ──
        const budgetLine = buildCompactFooterLine(contextWindow);
        lines.push(truncateToWidth(theme.fg("dim", budgetLine), width, theme.fg("dim", "...")));

        // Extension statuses
        const extensionStatuses = footerData.getExtensionStatuses();
        if (extensionStatuses.size > 0) {
          const statusLine = Array.from(extensionStatuses.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, text]) => text)
            .join(" ");
          lines.push(truncateToWidth(statusLine, width, theme.fg("dim", "...")));
        }

        return lines;
      },
    };
  });
}

/**
 * Compact footer: Sys% A% Sk% G% T+M% B% C% - Used% / TotalK model
 *
 * Categories:
 * - Sys  = System prompt (internal pi prompt + ALL contextFiles including global AGENTS.md)
 * - A    = AGENTS.md files (project-level, counted from contextFiles matching *AGENTS.md*)
 * - Sk   = Skills
 * - G    = Guidelines (contextFiles that are NOT AGENTS.md — already counted in Sys, shown separately)
 * - T    = Tools (native pi tools)
 * - M    = MCP tools
 * - B    = Builtin tools
 * - C    = Conversation (total usage minus source tokens)
 */
function buildCompactFooterLine(contextWindow: number): string {
  const breakdown = cachedBreakdown;
  if (!breakdown) return "";

  const window = contextWindow || 200_000;
  const pct = (tokens: number) => window > 0 ? String(Math.round((tokens / window) * 100)) : "0";

  // System = total systemPrompt tokens (internal pi prompt + ALL contextFiles)
  const systemTokens = breakdown.systemPrompt.tokens;

  // Agents = AGENTS.md files specifically (subset of systemPrompt)
  const agentsTokens = charsToTokens(
    breakdown.systemPrompt.items
      .filter((i) => /AGENTS\.md$/i.test(i.name))
      .reduce((s, i) => s + i.chars, 0)
  );

  // Skills
  const skillsTokens = breakdown.skills.tokens;

  // Guidelines = contextFiles that are NOT AGENTS.md (subset of system, shown for detail)
  const guidelinesTokens = charsToTokens(
    breakdown.systemPrompt.items
      .filter((i) => !/AGENTS\.md$/i.test(i.name))
      .reduce((s, i) => s + i.chars, 0)
  );

  // Tools breakdown by source
  const toolSources = breakdown.tools.items;
  const toolsTokens = toolSources.filter((i) => i.name === "Extension").reduce((s, i) => s + i.tokens, 0);
  const mcpTokens = toolSources.filter((i) => i.name === "Mcp").reduce((s, i) => s + i.tokens, 0);
  const builtinTokens = toolSources.filter((i) => i.name === "Builtin").reduce((s, i) => s + i.tokens, 0);

  // Combined tools for footer display: Tools + MCP
  const toolsPlusMcp = toolsTokens + mcpTokens;

  // Conversation
  const sourceTokens = breakdown.totalSourceTokens;
  const conversationTokens = Math.max(0, lastUsageTokens - sourceTokens);

  // Used = system + skills + tools + conversation
  const usedTokens = systemTokens + skillsTokens + breakdown.tools.tokens + conversationTokens;
  const usedPct = pct(usedTokens);

  // Short format: Sys% A% Sk% T+M% C% - Used% / TotalK
  const windowK = `${Math.round(window / 1000)}K`;
  const model = lastModel ? ` ${lastModel}` : "";

  return `Sys${pct(systemTokens)} A${pct(agentsTokens)} Sk${pct(skillsTokens)} T${pct(toolsPlusMcp)} · ${usedPct}%/${windowK}${model}`;
}

// ── Budget / Renderer helpers ───────────────────────────────────────

function buildSourceInput(
  systemPrompt: string,
  options: BuildSystemPromptOptions,
  tools: ToolInfo[]
): SourceInput {
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

function formatVerbose(breakdown: Breakdown): string {
  const parts: string[] = [];

  const list = (title: string, items: Array<{ name: string; chars: number }>) => {
    if (items.length === 0) return;
    parts.push(`\n${title}:`);
    for (const item of items) parts.push(`  ${item.name}: ${Math.ceil(item.chars / 4)} tokens`);
  };

  list("System files", breakdown.systemPrompt.items);
  list("Skills", breakdown.skills.items);

  if (breakdown.tools.items.length > 0) {
    parts.push("\nTool sources:");
    for (const item of breakdown.tools.items) {
      parts.push(`  ${item.name}: ${item.tokens} tokens (${item.count} tools)`);
    }
  }

  return parts.join("\n");
}

function charsToTokens(chars: number): number {
  return Math.ceil(chars / 4);
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
    footerEnabled,
    usage: lastUsageTokens,
    model: lastModel,
    contextWindow: lastContextWindow,
    hasCtx: Boolean(lastCtx),
  };
}
