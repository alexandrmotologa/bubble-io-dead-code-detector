# bubble-io-dead-code-detector

Dead code detector, dependency analyzer, and health scorer for Bubble.io applications.

[![npm version](https://img.shields.io/npm/v/bubble-io-dead-code-detector?color=7c3aed&style=flat-square)](https://www.npmjs.com/package/bubble-io-dead-code-detector)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/alexandrmotologa.bubble-dead-code-detector-vscode?color=007ACC&label=VS%20Code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=alexandrmotologa.bubble-dead-code-detector-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)

Find unused workflows, orphaned database fields, inactive plugins, and unreferenced styles before deployment.

---

## Why this tool exists

Large Bubble.io applications accumulate technical debt over development cycles:

- Workflows that are never triggered by user interactions or backend events
- Database fields created during prototyping that have no references
- Plugins installed but not tied to elements or actions, increasing bundle size
- Custom styles defined in the design tab but not applied to any element
- Data types without privacy rules, creating security exposure risks

Bubble.io provides no native garbage collection or linter for application exports. This tool parses `.bubble` export files and identifies dead assets deterministically.

---

## Usage modes

### VS Code extension

The extension integrates directly into the editor without requiring terminal setup.

**Installation:**
1. Open VS Code.
2. Press `Ctrl+Shift+X` and search for **Bubble.io Dead Code Detector**.
3. Select **Install**.

Or install via terminal:
```bash
code --install-extension alexandrmotologa.bubble-dead-code-detector-vscode
```

**Running an audit:**
1. Open your workspace containing a `.bubble` export file.
2. Right-click the `.bubble` file in the Explorer.
3. Select **Bubble: Run Dead Code Scan**.
4. Review findings in the Problems panel (`Ctrl+Shift+M`) or the generated HTML report.

**Extension commands:**

| Command | Action |
| :--- | :--- |
| `Bubble: Run Dead Code Scan` | Run complete audit and report findings in Problems view |
| `Bubble: Scan + Open HTML Report` | Run audit and launch interactive visual graph in browser |
| `Bubble: Clean (dry-run preview)` | Show assets eligible for removal without modifying file |

**Extension settings:**

| Setting | Default | Description |
| :--- | :--- | :--- |
| `bubbleDetector.minConfidence` | `MEDIUM` | Minimum confidence threshold for reported issues |
| `bubbleDetector.outputDir` | `./audit-results` | Directory for generated reports |
| `bubbleDetector.autoOpenHtml` | `true` | Open HTML visual report automatically |

---

### Command-line interface

Suitable for local terminal use, shell scripts, and CI/CD pipelines.

#### Install globally
```bash
npm install -g bubble-io-dead-code-detector
```

#### Run interactive mode
```bash
bubble-detector
```

#### Run directly with CLI flags
```bash
# Run full audit
bubble-detector scan --file ./my-app.bubble

# Generate interactive HTML graph
bubble-detector scan --file ./my-app.bubble --html

# Export all report formats simultaneously
bubble-detector scan --file ./my-app.bubble --json --html --markdown --csv --sarif --output-dir ./audit

# Enforce minimum health score in CI pipeline
bubble-detector scan --file ./my-app.bubble --fail-below 70

# Preview cleanup changes (safe dry-run)
bubble-detector clean --file ./my-app.bubble --dry-run

# Apply cleanup (creates timestamped backup automatically)
bubble-detector clean --file ./my-app.bubble --output ./cleaned-app.bubble

# Watch mode: re-scan automatically on file save
bubble-detector watch --file ./my-app.bubble --html

# Compare schema and debt between two export versions
bubble-detector diff --before ./v1.bubble --after ./v2.bubble
```

---

## Exporting the application file

1. Open your application in the Bubble editor.
2. Navigate to **Settings** -> **Export App**.
3. Click **Export** to download the `.bubble` file.
4. Supply the downloaded file to the CLI or open it in VS Code.

> [!NOTE]
> The `.bubble` export contains full application structure and configuration. Do not commit sensitive exports to public repositories.

---

## Command reference

### `scan`
```text
Options:
  -f, --file <path>          Path to .bubble export file (required)
  --json                     Export machine-readable audit-report.json
  --html                     Generate interactive HTML visual graph
  --markdown                 Generate Markdown report
  --csv                      Export audit-report.csv for spreadsheets
  --sarif                    Export SARIF for GitHub Code Scanning / GitLab SAST
  --output-dir <dir>         Output directory (default: ./audit-results)
  --only <rules>             Run only specified rules (comma-separated)
  --min-confidence <level>   Filter by confidence: HIGH, MEDIUM, LOW (default: LOW)
  --fail-below <score>       Exit with code 1 if health score is below threshold
```

### `clean`
```text
Options:
  -f, --file <path>          Path to .bubble export file (required)
  -o, --output <path>        Destination path for cleaned export (default: ./cleaned-app.bubble)
  --backup-dir <dir>         Backup directory (default: ./backups)
  --dry-run                  Preview modifications without writing to disk
  --force                    Skip interactive confirmation prompt
  --min-confidence <level>   Minimum confidence for automatic deletion (default: HIGH)
  --only <rules>             Target specific rules: dead-workflow, dead-plugin, dead-option-set, dead-style
  --rollback                 Restore from the most recent backup
```

### `watch`
Monitors a `.bubble` file and triggers re-analysis upon file changes:
```bash
bubble-detector watch --file ./my-app.bubble --html
```

### `diff`
Compares two application snapshots and produces a delta report:
```bash
bubble-detector diff --before ./app-v1.bubble --after ./app-v2.bubble
```

### `validate`
Verifies JSON integrity and top-level schema keys:
```bash
bubble-detector validate ./my-app.bubble
```

### `init`
Generates a starter `.bubblerc.json` configuration file:
```bash
bubble-detector init
```

---

## Health score evaluation

Each scan calculates an overall health index from 0 to 100:

| Score | Rating | Recommendation |
| :--- | :--- | :--- |
| 90-100 | Excellent | Clean schema, minimal unused definitions |
| 75-89 | Good | Minor dead code cleanup suggested |
| 55-74 | Fair | Noticeable technical debt |
| 35-54 | Poor | Architectural refactoring recommended |
| 0-34 | Critical | Severe schema and workflow accumulation |

---

## Detection rules

| Rule | Severity | Condition |
| :--- | :--- | :--- |
| `dead-workflow` | Error | Workflows never triggered by UI elements or backend events |
| `dead-field` | Warning | Database fields with zero references across the application |
| `dead-plugin` | Error | Installed plugins without associated elements or actions |
| `dead-style` | Info | Style definitions not applied to any page element |
| `dead-option-set` | Warning | Option sets unreferenced in any visual or workflow expression |
| `complexity` | Warning | Workflows exceeding action thresholds or dense page elements |
| `security` | Error | Missing privacy rules or unconstrained public endpoints |

---

## Output formats

| Format | Option | Primary use case |
| :--- | :--- | :--- |
| Console | Default | Formatted terminal output |
| HTML | `--html` | Interactive dependency graph and inspection UI |
| JSON | `--json` | Pipeline integration and custom scripting |
| Markdown | `--markdown` | Documentation and team wiki exports |
| CSV | `--csv` | Spreadsheet tracking |
| SARIF | `--sarif` | GitHub Code Scanning and CI security dashboards |

---

## Configuration (`.bubblerc.json`)

Configure global scan options via `.bubblerc.json`:

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

## CI/CD integration

Run automated audits in GitHub Actions workflows:

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

## Safety mechanisms for cleanup

1. **Automatic backups**: Generates a timestamped `.bubble.bak` before making changes.
2. **Dry-run mode**: Allows inspecting modifications prior to execution.
3. **Confidence gating**: Restricts automated deletion to high-confidence targets by default.
4. **Interactive confirmation**: Prompts the user before applying modifications.
5. **Rollback command**: Supports one-command recovery via `--rollback`.

---

## Documentation

- [Usage Guide](USAGE.md)
- [Architecture](docs/architecture.md)
- [Contributing](CONTRIBUTING.md)
- [Custom Rules](docs/custom-rules.md)
- [Schema Reference](docs/bubble-schema.md)

---

## License

MIT License. Copyright (c) 2026 Alexandr Motologa.
