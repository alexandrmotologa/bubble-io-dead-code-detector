<div align="center">

# 🫧 bubble-io-dead-code-detector

**Dead code detector, dependency analyzer & health scorer for Bubble.io applications**

[![npm version](https://img.shields.io/npm/v/bubble-io-dead-code-detector?color=7c3aed&style=flat-square)](https://www.npmjs.com/package/bubble-io-dead-code-detector)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/alexandrmotologa.bubble-dead-code-detector-vscode?color=007ACC&label=VS%20Code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=alexandrmotologa.bubble-dead-code-detector-vscode)
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

## Two Ways to Use It

### Option 1 — VS Code Extension (Recommended for most users)

> No terminal knowledge required. Works entirely inside VS Code.

**Install from the Marketplace:**

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for **"Bubble.io Dead Code Detector"**
4. Click **Install**

**Or install via command line:**
```bash
code --install-extension alexandrmotologa.bubble-dead-code-detector-vscode
```

**How to use the extension:**
1. Open your project folder in VS Code
2. Right-click any `.bubble` file in the Explorer panel
3. Select **"Bubble: Run Dead Code Scan"**
4. Findings appear in the **Problems panel** (`Ctrl+Shift+M`)
5. The HTML visual report opens automatically in your browser

**Extension commands (Command Palette — `Ctrl+Shift+P`):**

| Command | What it does |
|---|---|
| `Bubble: Run Dead Code Scan` | Full audit, shows results in Problems panel |
| `Bubble: Scan + Open HTML Report` | Same, but always opens visual HTML report |
| `Bubble: Clean (dry-run preview)` | Shows what can be safely removed |

**Extension settings (`File → Preferences → Settings → Bubble Dead Code Detector`):**

| Setting | Default | Description |
|---|---|---|
| `bubbleDetector.minConfidence` | `MEDIUM` | Minimum confidence level to show |
| `bubbleDetector.outputDir` | `./audit-results` | Where to save reports |
| `bubbleDetector.autoOpenHtml` | `true` | Open HTML report automatically |

---

### Option 2 — CLI (Command Line Interface)

> For developers, CI/CD pipelines, and automation.

#### Install globally

```bash
npm install -g bubble-io-dead-code-detector
```

#### Run interactive mode (no arguments needed)

```bash
bubble-detector
```

#### Or use CLI flags directly

```bash
# Full audit
bubble-detector scan --file ./my-app.bubble

# Audit with visual HTML graph
bubble-detector scan --file ./my-app.bubble --html

# All report formats at once
bubble-detector scan --file ./my-app.bubble --json --html --markdown --csv --sarif --output-dir ./audit

# Fail in CI if health score drops below 70
bubble-detector scan --file ./my-app.bubble --fail-below 70

# Preview dead code removal (safe dry-run)
bubble-detector clean --file ./my-app.bubble --dry-run

# Actually clean (creates backup automatically)
bubble-detector clean --file ./my-app.bubble --output ./cleaned-app.bubble

# Watch mode — auto re-scan when file changes
bubble-detector watch --file ./my-app.bubble --html

# Compare two versions
bubble-detector diff --before ./v1.bubble --after ./v2.bubble
```

---

## How to Get Your `.bubble` File

1. Open your Bubble app editor
2. Go to **Settings** → **Export App**
3. Click **Export** — this downloads a `.bubble` file
4. Use it with the VS Code extension or CLI

> ⚠️ Warning: The `.bubble` file contains your full app structure and potentially sensitive configuration. Keep it private — never commit it to public repositories.

---

## CLI Commands Reference

### `scan` — Full App Audit

```
Options:
  -f, --file <path>          Path to .bubble export file (required)
  --json                     Export machine-readable audit-report.json
  --html                     Generate interactive HTML visual graph
  --markdown                 Generate Notion/Confluence-ready Markdown report
  --csv                      Export audit-report.csv for Excel / Google Sheets
  --sarif                    Export SARIF for GitHub Actions / GitLab CI
  --output-dir <dir>         Output directory (default: ./audit-results)
  --only <rules>             Run only specific rules (comma-separated)
  --min-confidence <level>   Report only HIGH|MEDIUM|LOW findings (default: LOW)
  --fail-below <score>       Exit code 1 if health score is below threshold
```

### `clean` — Safe Dead Code Removal

```
Options:
  -f, --file <path>          Path to .bubble export file (required)
  -o, --output <path>        Output path for cleaned file (default: ./cleaned-app.bubble)
  --backup-dir <dir>         Backup directory (default: ./backups)
  --dry-run                  Preview changes without applying them
  --force                    Skip interactive confirmation
  --min-confidence <level>   Minimum confidence for auto-delete (default: HIGH)
  --only <rules>             Only clean specific rule types:
                               dead-workflow, dead-plugin,
                               dead-option-set, dead-style
  --rollback                 Restore from the latest backup
```

### `watch` — Auto Re-Scan on File Change

```bash
# Re-scans automatically every time you save a new .bubble export
bubble-detector watch --file ./my-app.bubble

# With HTML report regeneration
bubble-detector watch --file ./my-app.bubble --html
```

Shows **delta output** between scans — which issues were fixed and which are new.

### `diff` — Compare Two App Versions

```bash
# Compare two .bubble exports and show what changed
bubble-detector diff --before ./app-v1.bubble --after ./app-v2.bubble

# Export diff as JSON
bubble-detector diff --before ./v1.bubble --after ./v2.bubble --json
```

Output includes: health score delta, fixed issues, newly introduced issues, unchanged count.

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
| 90–100 | 🟢 Excellent | Clean and maintainable |
| 75–89 | 🟡 Good | Minor cleanup recommended |
| 55–74 | 🟠 Fair | Moderate technical debt |
| 35–54 | 🔴 Poor | Significant refactoring needed |
| 0–34 | 🔴 Critical | App is heavily bloated |

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
| HTML | `--html` | Interactive visual dependency graph |
| JSON | `--json` | Machine-readable — CI pipelines and scripts |
| Markdown | `--markdown` | Notion, Confluence, GitHub documentation |
| CSV | `--csv` | Excel, Google Sheets |
| SARIF | `--sarif` | GitHub Code Scanning, GitLab SAST, Azure DevOps |

---

## Configuration (`.bubblerc.json`)

Run `bubble-detector init` to generate a config file, then customize:

```json
{
  "ignore": {
    "workflows": ["legacy-migration-wf"],
    "fields": ["temp_field_old"],
    "plugins": [],
    "optionSets": [],
    "styles": []
  },
  "rules": {
    "dead-workflow": { "enabled": true, "severity": "error" },
    "dead-field": { "enabled": true, "severity": "warning" },
    "dead-plugin": { "enabled": true, "severity": "error" },
    "dead-style": { "enabled": true, "severity": "info" },
    "dead-option-set": { "enabled": true, "severity": "warning" },
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
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

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

- [Full Usage Guide (USAGE.md)](USAGE.md) — Step-by-step instructions for all features
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