# Architecture Guide

## Overview

`bubble-io-dead-code-detector` is a static analysis toolkit for Bubble.io application exports. It reads the raw `.bubble` JSON file, constructs a dependency graph, applies analysis rules, and produces actionable reports.

---

## High-Level Architecture

```
.bubble file
    │
    ▼
┌───────────┐       ┌─────────────────────────────────────┐
│  Parser   │──────▶│          ParsedBubbleApp             │
│  Layer    │       │  pages, elements, workflows, fields,  │
│           │       │  dataTypes, optionSets, styles,       │
│           │       │  plugins, apiWorkflows                │
└───────────┘       └────────────────┬────────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   Dependency Graph    │
                         │   (DAG — nodes+edges) │
                         └──────────┬────────────┘
                                    │
                         ┌──────────▼────────────┐
                         │     Rule Engine        │
                         │  dead-workflow         │
                         │  dead-field            │
                         │  dead-plugin           │
                         │  dead-style            │
                         │  dead-option-set       │
                         │  complexity            │
                         │  security              │
                         └──────────┬────────────┘
                                    │
                         ┌──────────▼────────────┐
                         │    Health Scorer       │
                         │  Weighted 0-100 score  │
                         └──────────┬────────────┘
                                    │
                    ┌───────────────┼───────────────────┐
                    ▼               ▼                   ▼
              Console           JSON/Markdown         HTML/SARIF
              Reporter           Reporter              Reporter
```

---

## Layer Descriptions

### 1. Parser Layer (`src/parser/`)

Responsible for reading and normalizing the raw Bubble export format.

| File | Responsibility |
|---|---|
| `bubble-reader.ts` | File I/O and basic JSON validation |
| `schema.ts` | TypeScript interfaces for raw and parsed structures |
| `page-parser.ts` | Parses pages, element trees, and workflows |
| `database-parser.ts` | Parses data types, fields, option sets, styles, plugins |
| `element-parser.ts` | Parses reusable elements and API/backend workflows |
| `expression-parser.ts` | Recursively traverses Bubble expression trees to extract references |
| `index.ts` | Orchestrates all parsers into a single `ParsedBubbleApp` |

**Why a separate expression parser?**
Bubble stores all dynamic data references (searches, field accesses, element lookups) as nested JSON objects called _expressions_. These can be 50+ levels deep. The `expression-parser` recursively traverses them to extract:
- Data type references (e.g. `Search for user`)
- Field slug references (e.g. `user.email_text`)
- Element ID references (e.g. `Get data from Input A`)
- Option Set references

Without this traversal, dead code detection would miss most references.

---

### 2. Dependency Graph (`src/analyzer/graph/`)

A directed graph where:
- **Nodes** = app entities (pages, elements, workflows, fields, plugins, etc.)
- **Edges** = references between them (`references`, `triggers`, `contains`, `styles`)

**Dead code** = nodes with **zero incoming edges** (no one references them).

Special cases handled:
- `PageLoaded`, `LoggedIn`, `RecurringEvent` → always alive (system triggers)
- Plugin elements → use plugin ID prefix matching (e.g. `1604083196447x...`)
- Relational fields → lower confidence (may be referenced dynamically)

---

### 3. Rule Engine (`src/analyzer/rules/`)

Each rule implements the `BubbleRule` interface:
```typescript
interface BubbleRule {
  id: string;
  check(context: RuleContext): Finding[];
}
```

All rules receive the `ParsedBubbleApp` and `DependencyGraph` and return `Finding[]`.

| Rule ID | What it detects |
|---|---|
| `dead-workflow` | Workflows with no triggering element |
| `dead-field` | Database fields with no references |
| `dead-plugin` | Installed plugins with no element usage |
| `dead-style` | Styles not applied to any element |
| `dead-option-set` | Option sets not referenced anywhere |
| `complexity` | Workflows >15 actions, pages >200 elements, deep nesting |
| `security` | Missing privacy rules, exposed API endpoints |

---

### 4. Health Scorer (`src/analyzer/health-scorer.ts`)

Produces a **0-100 score** using weighted penalties:

```
score = 100 - Σ(dead_ratio × weight)
```

| Category | Default Weight |
|---|---|
| Dead Workflows | 25 |
| Dead DB Fields | 20 |
| Inactive Plugins | 20 |
| Unused Styles | 10 |
| Unused Option Sets | 5 |
| Complexity | 10 |
| Security | 10 |

Grades: `excellent (90+)` → `good (75+)` → `fair (55+)` → `poor (35+)` → `critical (<35)`

---

### 5. Reporters (`src/reporters/`)

| Reporter | Output | Use Case |
|---|---|---|
| Console | Terminal color output | Interactive development |
| JSON | `audit-report.json` | CI pipelines, scripting |
| Markdown | `audit-report.md` | Notion, Confluence, GitHub |
| HTML | `audit-report.html` | Visual graph exploration |
| SARIF | `audit-report.sarif` | GitHub Code Scanning, GitLab SAST |

---

### 6. Cleaner (`src/cleaner/`)

**Safety layers before any deletion:**
1. Creates a timestamped `.bubble.bak` backup
2. Dry-run by default
3. Only deletes items where `safeToDelete = true`
4. Confidence gate (default: `HIGH` only)
5. Interactive confirmation via `@clack/prompts`

Currently auto-patchable: only **empty workflows** (0 actions, no trigger element).
All other deletions require manual verification in the Bubble editor.

---

## Configuration (`.bubblerc.json`)

```json
{
  "rules": {
    "dead-workflow": { "enabled": true, "severity": "error" },
    "complexity": { "enabled": true, "maxWorkflowActions": 20 }
  },
  "healthScore": { "failBelow": 70 },
  "output": { "dir": "./audit-results", "formats": ["json", "html"] },
  "clean": { "backupDir": "./backups", "minConfidence": "HIGH" }
}
```

---

## Known Limitations

1. **Dynamic references**: Bubble allows accessing fields via variables (e.g. `do a search for X's field_name`). These indirect references may not be captured, leading to false positives on field usage.

2. **Plugin triggers**: Plugin-generated workflow triggers use long numeric IDs. We give `MEDIUM` confidence to these findings to avoid false positives.

3. **Reusable element usage**: Whether a reusable element is actually placed on a page is partially tracked. Future versions will improve this with explicit `CustomElement` placement detection.

4. **Conditional visibility**: Elements that are always hidden may still be intentional (e.g. popups). We flag them as `info` rather than `error`.

5. **Export staleness**: The `.bubble` export represents a snapshot. Re-export regularly to get accurate results.
