# Contributing Guide

## Getting Started

```bash
git clone https://github.com/alexandrmotologa/bubble-io-dead-code-detector.git
cd bubble-io-dead-code-detector
npm install
npm run build
```

## Development

```bash
# Watch mode (rebuilds on file changes)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── index.ts                     # CLI entry point
├── cli/
│   ├── commands/
│   │   ├── scan.ts              # `scan` command
│   │   └── clean.ts             # `clean` command
│   └── interactive.ts           # Interactive TUI
├── parser/
│   ├── schema.ts                # TypeScript interfaces
│   ├── bubble-reader.ts         # File I/O
│   ├── page-parser.ts           # Pages & workflows
│   ├── database-parser.ts       # Data types, styles, plugins
│   ├── element-parser.ts        # Reusable elements & API workflows
│   ├── expression-parser.ts     # Bubble expression traversal
│   └── index.ts                 # Parser orchestrator
├── analyzer/
│   ├── graph/
│   │   ├── dag.ts               # Dependency graph data structure
│   │   └── edge-resolver.ts     # Graph builder
│   ├── rules/
│   │   ├── rule.interface.ts    # Rule contract
│   │   ├── rule-engine.ts       # Rule orchestrator
│   │   ├── dead-workflow.rule.ts
│   │   ├── dead-field.rule.ts
│   │   ├── dead-plugin.rule.ts
│   │   ├── dead-style.rule.ts
│   │   ├── complexity.rule.ts
│   │   └── security.rule.ts
│   ├── health-scorer.ts         # 0-100 score calculator
│   └── index.ts                 # Analyzer orchestrator
├── reporters/
│   ├── console-reporter.ts      # Terminal color output
│   ├── json-reporter.ts         # audit-report.json
│   ├── markdown-reporter.ts     # audit-report.md
│   ├── html-reporter.ts         # audit-report.html (Vis.js graph)
│   └── sarif-reporter.ts        # audit-report.sarif (CI/CD)
├── cleaner/
│   └── index.ts                 # Safe dead code removal
└── config/
    └── config-loader.ts         # .bubblerc.json loader
docs/
├── architecture.md              # System design
├── contributing.md              # This file
├── custom-rules.md              # Writing custom rules
└── bubble-schema.md             # .bubble file format reference
```

## Writing a Custom Rule

1. Create `src/analyzer/rules/my-rule.rule.ts`:

```typescript
import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

export const myCustomRule: BubbleRule = {
  id: 'my-rule',
  name: 'My Custom Rule',
  description: 'What this rule checks for',
  category: 'quality',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ app, graph, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];

    // Your analysis logic here

    return findings;
  },
};
```

2. Register it in `src/analyzer/rules/rule-engine.ts`:

```typescript
import { myCustomRule } from './my-rule.rule.js';

export const ALL_RULES: BubbleRule[] = [
  // ...existing rules...
  myCustomRule,
];
```

3. Add it to `.bubblerc.json` to configure it:

```json
{
  "rules": {
    "my-rule": { "enabled": true, "severity": "error" }
  }
}
```

## Adding a New Reporter

1. Create `src/reporters/my-reporter.ts`
2. Export a function `writeMyReport(result: AnalysisResult, outputDir: string): string`
3. Import and call it in `src/cli/commands/scan.ts`

## Pull Request Guidelines

- All code in English (comments, variable names, file names)
- TypeScript strict mode must pass (`npm run typecheck`)
- Add tests for new rules in `tests/`
- Update `CHANGELOG.md`
- Test against at least one real `.bubble` file (do NOT commit real `.bubble` files)

## Testing Against a Real App

```bash
# Build first
npm run build

# Test against your own bubble export
node dist/index.js scan --file /path/to/your-app.bubble --html
```
