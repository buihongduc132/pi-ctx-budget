---
name: pi-ctx-budget
description: Context window budget display for pi. Use /ctx-budget to see token breakdown, /ctx-budget footer to toggle category bars.
---

# pi-ctx-budget

Show context-budget usage inside pi sessions.

## Purpose
Provides `/ctx-budget` output and a toggleable footer for context token visibility.

## Commands
- `/ctx-budget` — show compact budget table
- `/ctx-budget all` — show detailed per-item breakdown
- `/ctx-budget --verbose` — same as `all`
- `/ctx-budget footer` — show footer toggle status
- `/ctx-budget footer on` — enable footer
- `/ctx-budget footer off` — disable footer
- `/ctx-budget footer <category>` — toggle a category (agents, system, skills, guidelines, tools, mcp, builtin, conversation, free)

## Notes
- Non-blocking hooks only; failures swallowed silently.
- Pure logic lives in `extensions/estimator.ts`, `extensions/renderer.ts`, and `extensions/footer.ts`.
