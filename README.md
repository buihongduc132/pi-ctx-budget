# pi-ctx-budget

[![npm version](https://img.shields.io/npm/v/pi-ctx-budget.svg)](https://www.npmjs.com/package/pi-ctx-budget)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Context window budget display for **pi** — track token usage across system prompts, skills, tools, and conversation with a `/ctx-budget` command and toggleable footer bar.

## Features

- **Token estimation** — estimates source token usage from system context, skills, and tool schemas
- **Runtime tracking** — shows conversation token usage from live context data
- **Compact display** — renders ASCII budget summary with percentage breakdown
- **Toggleable footer** — optional persistent footer bar showing per-category token percentages
- **Persistent config** — footer preference saved to `~/.pi/pi-ctx-budget.json`
- **Environment overrides** — `PI_CTX_BUDGET_FOOTER=1` to force-enable footer

## Installation

### For Humans

```bash
npm install -g pi-ctx-budget
```

### For AI Agents

This is a **pi extension package**. Add it to your pi `settings.json`:

```json
{
  "packages": [
    {
      "name": "pi-ctx-budget",
      "url": "https://github.com/buihongduc132/pi-ctx-budget.git"
    }
  ]
}
```

### For pi git-sourced

Clone into your git-sourced extensions directory:

```bash
cd ~/.pi/agent/git/github.com/buihongduc132/
git clone https://github.com/buihongduc132/pi-ctx-budget.git
```

Then ensure `settings.json` includes the git-sourced path.

## Usage

### `/ctx-budget` command

| Command | Description |
|---------|-------------|
| `/ctx-budget` | Compact budget summary |
| `/ctx-budget all` | Verbose per-item breakdown |
| `/ctx-budget --verbose` | Same as `all` |
| `/ctx-budget detail` | Same as `all` |
| `/ctx-budget footer` | Show footer toggle status |
| `/ctx-budget footer on` | Enable footer (persisted) |
| `/ctx-budget footer off` | Disable footer (persisted) |
| `/ctx-budget footer <category>` | Toggle a footer category |

### Footer categories

The footer bar shows percentage of context window used per category:

- **Sys** — System prompt (internal pi prompt + all context files)
- **A** — AGENTS.md files
- **Sk** — Skills
- **T** — Extension + MCP tools

### Example output

```
╭─ Context Budget ──────────────────────────────────────╮
│ System    12,450t  ██████████████░░░░░░░░░  8.3%     │
│ Skills     1,200t  ████░░░░░░░░░░░░░░░░░░░  0.8%     │
│ Tools      3,800t  █████░░░░░░░░░░░░░░░░░  2.5%     │
│ Conv       8,200t  ███████████░░░░░░░░░░░  5.5%     │
│ Free    134,350t  ░░░░░░░░░░░░░░░░░░░░  82.9%     │
│ Model: gpt-4o  Window: 150K                         │
╰──────────────────────────────────────────────────────╯
```

## Development

```bash
npm install
npm run typecheck    # TypeScript type checking
npm test             # Run tests
npm run test:coverage # Tests with coverage
npm run smoke-test   # Quick smoke test
npm pack --dry-run   # Verify package contents
```

## License

MIT © [buihongduc132](https://github.com/buihongduc132)
