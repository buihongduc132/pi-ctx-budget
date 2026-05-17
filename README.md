# pi-ctx-budget

Context window budget display for pi: a `/ctx-budget` command and optional footer indicator.

## Features
- Estimates source token usage from system context, skills, and tool schemas
- Shows conversation token usage from runtime context data
- Renders compact ASCII budget summary
- Supports toggleable footer categories

## Installation
Add this package to your pi plugins/extensions workspace, then ensure your pi package config includes:

```json
{
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"]
  }
}
```

## Usage
- `ctx-budget` -> compact summary
- `ctx-budget all` -> verbose breakdown
- `ctx-budget --verbose` -> verbose breakdown
- `ctx-budget footer on` -> enable footer
- `ctx-budget footer off` -> disable footer
- `ctx-budget footer tools` -> toggle one footer category

## Development
- Run tests: `npx vitest run --run`
- Run smoke test: `npm run smoke-test`
