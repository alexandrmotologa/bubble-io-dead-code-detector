<div align="center">

# 🫧 bubble-io-dead-code-detector

**Dead code detector, dependency analyzer & health scorer for Bubble.io applications**

[![npm version](https://img.shields.io/npm/v/bubble-io-dead-code-detector?color=7c3aed&style=flat-square)](https://www.npmjs.com/package/bubble-io-dead-code-detector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)

*Find unused workflows, orphaned database fields, inactive plugins, and more — before they become a problem.*

</div>

---

## Why does this tool exist?

Large Bubble.io apps accumulate technical debt silently:

- 🧹 **Half-deleted workflows** that are never triggered
- 🗄️ **Database fields** created during prototyping, never referenced
- 🔌 **Plugins installed but never used** — slowing page loads
- 🎨 **Styles defined but not applied** to any element
- 🔐 **Data types without privacy rules** — potential data leaks

Bubble provides no built-in linter or garbage collector. This tool fills that gap.

---

## How to Get Your `.bubble` File

1. Open your Bubble app editor
2. Go to **Settings** → **Export App**
3. Click **Export** — this downloads a `.bubble` file
4. Run this tool on that file

> Warning: The `.bubble` file contains your full app structure and potentially sensitive configuration. Keep it private and never commit it to public repositories.

---

## Quick Start

### Install globally

```bash
npm install -g bubble-io-dead-code-detector
```

### Run interactive mode (no arguments needed)

```bash
bubble-detector
```

### Or use CLI flags directly

```bash
# Full audit
bubble-detector scan --file ./my-app.bubble

# Audit with visual HTML graph
bubble-detector scan --file ./my-app.bubble --html

# All report formats at once
bubble-detector scan --file ./my-app.bubble --json --html --markdown --sarif --output-dir ./audit

# Fail in CI if health score drops below 70
bubble-detector scan --file ./my-app.bubble --fail-below 70

# Preview dead code removal (safe dry-run)
bubble-detector clean --file ./my-app.bubble --dry-run

# Actually clean (creates backup automatically)
bubble-detector clean --file ./my-app.bubble --output ./cleaned-app.bubble
```

---

## CLI Commands

### `scan` — Full App Audit

```
Usage: bubble-detector scan [options]

Options:
  -f, --file <path>          Path to .bubble export file (required)
  --json                     Export machine-readable audit-report.json
  --html                     Generate interactive HTML visual graph
  --markdown                 Generate Notion/Confluence-ready Markdown report
  --sarif                    Export SARIF for GitHub Actions / GitLab CI
  --output-dir <dir>         Output directory (default: ./audit-results)
  --only <rules>             Run only specific rules (comma-separated)
  --min-confidence <level>   Report only HIGH|MEDIUM|LOW findings (default: LOW)
  --fail-below <score>       Exit code 1 if health score is below threshold
```

### `clean` — Safe Dead Code Removal

```
Usage: bubble-detector clean [options]

Options:
  -f, --file <path>          Path to .bubble export file (required)
  -o, --output <path>        Output path for cleaned file (default: ./cleaned-app.bubble)
  --backup-dir <dir>         Backup directory (default: ./backups)
  --dry-run                  Preview changes without applying them
  --force                    Skip interactive confirmation
  --min-confidence <level>   Minimum confidence for auto-delete (default: HIGH)
  --only <rules>             Only clean specific rule types
  --rollback                 Restore from the latest backup
```

### `validate` — Check File Validity

```bash
bubble-detector validate ./my-app.bubble
```

### `init` — Generate Config File

```bash
bubble-detector init
# Creates .bubblerc.json in the current directory
```

---

## Output: Health Score

Every scan produces a **0-100 health score**:

| Score | Grade | Description |
|---|---|---|
| 90-100 | Excellent | Clean and maintainable |
| 75-89 | Good | Minor cleanup recommended |
| 55-74 | Fair | Moderate technical debt |
| 35-54 | Poor | Significant refactoring needed |
| 0-34 | Critical | App is heavily bloated |

---

## What Gets Detected

| Rule | Severity | What it finds |
|---|---|---|
| `dead-workflow` | Error | Workflows never triggered by any UI element |
| `dead-field` | Warning | Database fields with no references anywhere |
| `dead-plugin` | Error | Installed plugins with no element or workflow usage |
| `dead-style` | Info | Styles defined but not applied to any element |
| `dead-option-set` | Warning | Option sets not referenced in any expression |
| `complexity` | Warning | Workflows with too many actions, pages with too many elements |
| `security` | Error | Missing privacy rules, data exposed via API without restrictions |

---

## Reports

| Format | Flag | Use Case |
|---|---|---|
| Console | (default) | Rich terminal output — development use |
| HTML | `--html` | Interactive visual dependency graph (Vis.js) |
| JSON | `--json` | Machine-readable — CI pipelines and scripts |
| Markdown | `--markdown` | Notion, Confluence, GitHub documentation |
| SARIF | `--sarif` | GitHub Code Scanning, GitLab SAST, Azure DevOps |

---

## Configuration (`.bubblerc.json`)

Run `bubble-detector init` to generate a config file, then customize:

```json
{
  "rules": {
    "dead-workflow": { "enabled": true, "severity": "error" },
    "dead-field": { "enabled": true, "severity": "warning" },
    "complexity": {
      "enabled": true,
      "maxWorkflowActions": 15,
      "maxPageElements": 200
    },
    "security": {
      "enabled": true,
      "checkPrivacyRules": true,
      "checkExposedEndpoints": true
    }
  },
  "healthScore": { "failBelow": 70 },
  "output": { "dir": "./audit-results", "formats": ["json", "html"] },
  "clean": { "backupDir": "./backups", "minConfidence": "HIGH" }
}
```

---

## CI/CD Integration (GitHub Actions)

```yaml
name: Bubble App Audit
on:
  schedule:
    - cron: '0 9 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g bubble-io-dead-code-detector
      - run: |
          bubble-detector scan \
            --file ./app.bubble \
            --sarif --json \
            --output-dir ./audit-results \
            --fail-below 70
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ./audit-results/audit-report.sarif
```

---

## Safety (Clean Command)

1. **Mandatory backup** — timestamped `.bubble.bak` before any change
2. **Dry-run first** — preview what would be removed
3. **Confidence gate** — only deletes `HIGH` confidence items by default
4. **Interactive confirmation** — prompts before applying changes
5. **Rollback support** — `--rollback` to restore from backup

---

## Documentation

- [Architecture Guide](docs/architecture.md) — How the system works internally
- [Contributing Guide](docs/contributing.md) — How to add new rules or reporters
- [Custom Rules Guide](docs/custom-rules.md) — Writing your own analysis rules
- [.bubble Schema Reference](docs/bubble-schema.md) — File format documentation

---

## License

MIT

---

<div align="center">
Made for the Bubble.io community
</div>