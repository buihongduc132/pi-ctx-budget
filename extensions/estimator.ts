export interface ToolGroup {
  name: string;
  count: number;
  chars: number;
  tokens: number;
}

export interface BreakdownItem {
  name: string;
  chars: number;
}

export interface CategoryBreakdown {
  chars: number;
  tokens: number;
  items: BreakdownItem[];
}

export interface ToolBreakdown {
  chars: number;
  tokens: number;
  items: ToolGroup[];
}

export interface Breakdown {
  systemPrompt: CategoryBreakdown;
  skills: CategoryBreakdown;
  tools: ToolBreakdown;
  totalSourceChars: number;
  totalSourceTokens: number;
}

export interface SourceInput {
  systemPrompt: string;
  contextFiles: { name: string; content: string }[];
  skills: { name: string; content: string }[];
  tools: { name: string; source: string; schema: string }[];
}

export function charsToTokens(chars: number): number {
  if (chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

export function computeBreakdown(input: SourceInput): Breakdown {
  const systemItems: BreakdownItem[] = input.contextFiles.map((f) => ({
    name: f.name,
    chars: f.content.length
  }));
  const systemChars = input.contextFiles.reduce((sum, f) => sum + f.content.length, 0);

  const skillChars = input.skills.reduce((sum, s) => sum + s.content.length, 0);
  const skillItems: BreakdownItem[] = input.skills.map((s) => ({
    name: s.name,
    chars: s.content.length
  }));

  const sourceMap = new Map<string, { count: number; chars: number }>();
  for (const tool of input.tools) {
    const key = capitalize(tool.source);
    const existing = sourceMap.get(key) ?? { count: 0, chars: 0 };
    existing.count += 1;
    existing.chars += tool.schema.length;
    sourceMap.set(key, existing);
  }

  const toolGroups: ToolGroup[] = [...sourceMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, { count, chars }]) => ({
      name,
      count,
      chars,
      tokens: charsToTokens(chars)
    }));
  const toolChars = input.tools.reduce((sum, t) => sum + t.schema.length, 0);

  const totalSourceChars = systemChars + skillChars + toolChars;

  return {
    systemPrompt: { chars: systemChars, tokens: charsToTokens(systemChars), items: systemItems },
    skills: { chars: skillChars, tokens: charsToTokens(skillChars), items: skillItems },
    tools: { chars: toolChars, tokens: charsToTokens(toolChars), items: toolGroups },
    totalSourceChars,
    totalSourceTokens: charsToTokens(totalSourceChars),
  };
}

function capitalize(s: string): string {
  if (s === "mcp") return "MCP";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
