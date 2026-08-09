# Usage Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [How to Get Your .bubble File](#how-to-get-your-bubble-file)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [All Commands](#all-commands)
  - [scan](#scan---full-app-audit)
  - [clean](#clean---safe-dead-code-removal)
  - [diff](#diff---compare-two-versions)
  - [watch](#watch---auto-rescan-on-change)
  - [validate](#validate---check-file-validity)
  - [init](#init---generate-config-file)
- [Understanding the Report](#understanding-the-report)
- [Full Workflow](#full-workflow)
- [CI/CD Integration](#cicd-integration)
- [Configuration Reference](#configuration-reference)
- [FAQ](#faq)

---

## Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org)
- A **Bubble.io** account with at least one app

Check your Node.js version:
```bash
node --version
# Should print v18.x.x or higher
```

---

## How to Get Your `.bubble` File

Your `.bubble` file is a complete export of your Bubble application structure.

**Step-by-step:**

1. Open your Bubble app in the editor
2. Click **Settings** in the left sidebar
3. Scroll down to the **Export App** section
4. Click the **Export** button
5. A `.bubble` file will download to your computer

> **Security Warning:** The `.bubble` file contains your app's complete structure,
> plugin configurations, and potentially API key references. Keep it private.
> Never commit it to a public repository.

---

## Installation

### Global Install (recommended)

```bash
npm install -g bubble-io-dead-code-detector
```

After installing, the `bubble-detector` command is available globally:

```bash
bubble-detector --version
```

### Local / Project Install

```bash
npm install --save-dev bubble-io-dead-code-detector
npx bubble-detector --version
```

---

## Quick Start

**Interactive mode** — run with no arguments to get a guided experience:

```bash
bubble-detector
```

**Or jump straight in:**

```bash
# Full audit in the terminal
bubble-detector scan --file ./my-app.bubble

# Audit + interactive HTML graph report
bubble-detector scan --file ./my-app.bubble --html

# Open the HTML report
open ./audit-results/audit-report.html       # macOS
start ./audit-results/audit-report.html      # Windows
xdg-open ./audit-results/audit-report.html   # Linux
```

---

## All Commands

### `scan` — Full App Audit

Runs all analysis rules and prints a health report.

```bash
bubble-detector scan --file <path> [options]
```

| Option | Description | Default |
|---|---|---|
| `-f, --file <path>` | Path to .bubble export (**required**) | — |
| `--json` | Export `audit-report.json` | off |
| `--html` | Generate interactive HTML graph | off |
| `--markdown` | Generate `audit-report.md` for Notion/Confluence | off |
| `--csv` | Export `audit-report.csv` for Excel/Sheets | off |
| `--sarif` | Export SARIF for GitHub/GitLab CI | off |
| `--output-dir <dir>` | Where to save reports | `./audit-results` |
| `--only <rules>` | Run specific rules only (comma-separated) | all rules |
| `--min-confidence <level>` | Filter: `HIGH`, `MEDIUM`, or `LOW` findings | `LOW` |
| `--fail-below <score>` | Exit code 1 if health score is below this | disabled |

**Examples:**

```bash
# Run only security checks
bubble-detector scan --file ./app.bubble --only security

# All report formats
bubble-detector scan --file ./app.bubble --json --html --markdown --csv --sarif

# CI gate: fail if health drops below 70
bubble-detector scan --file ./app.bubble --fail-below 70

# Only show high-confidence findings
bubble-detector scan --file ./app.bubble --min-confidence HIGH
```

---

### `clean` — Safe Dead Code Removal

Removes verified-safe dead code from the `.bubble` file.

> **Always creates a timestamped backup before making any change.**

```bash
bubble-detector clean --file <path> [options]
```

| Option | Description | Default |
|---|---|---|
| `-f, --file <path>` | Path to .bubble export (**required**) | — |
| `-o, --output <path>` | Output path for cleaned file | `./cleaned-app.bubble` |
| `--backup-dir <dir>` | Where to store backups | `./backups` |
| `--dry-run` | Preview changes without applying them | off |
| `--force` | Skip interactive confirmation | off |
| `--min-confidence <level>` | Only clean `HIGH`, `MEDIUM`, or `LOW` items | `HIGH` |
| `--only <rules>` | Only clean specific rule types (comma-separated) | all safe types |
| `--rollback` | Restore from the latest backup | — |

**Supported `--only` values:**

| Value | What gets removed |
|---|---|
| `dead-plugin` | Inactive plugins from `settings.client_safe.plugins` |
| `dead-option-set` | Unused option sets from `option_sets` |
| `dead-style` | Unused styles from `styles` |

**Examples:**

```bash
# Preview what would be removed (safe — no changes made)
bubble-detector clean --file ./app.bubble --dry-run

# Clean only inactive plugins
bubble-detector clean --file ./app.bubble --only dead-plugin

# Clean option sets + styles, skip confirmation
bubble-detector clean --file ./app.bubble --only dead-option-set,dead-style --force

# Full clean with custom output location
bubble-detector clean --file ./app.bubble --output ./app-cleaned.bubble

# Restore from latest backup
bubble-detector clean --file ./app.bubble --rollback
```

**After cleaning:** Upload the output `.bubble` file back to Bubble:
1. Go to **Settings** → **Import App**
2. Upload the cleaned `.bubble` file
3. Test that your app still works correctly

---

### `diff` — Compare Two Versions

Compares two `.bubble` exports and shows what changed between them.

```bash
bubble-detector diff --before <path> --after <path> [options]
```

| Option | Description |
|---|---|
| `--before <path>` | Older app version (**required**) |
| `--after <path>` | Newer app version (**required**) |
| `--json` | Export diff as `diff-report.json` |
| `--output-dir <dir>` | Where to save output (default: `./audit-results`) |

**Example:**

```bash
# Compare last month's export with today's
bubble-detector diff --before ./app-jan.bubble --after ./app-feb.bubble
```

**Output example:**
```
Health Score:  54 → 67  (+13 points)

  ✅ Fixed (8 issues resolved):
    · dead-plugin  Plugin [Ionic Datetime Picker] — removed
    · dead-option-set  Option Set "x4" — removed
    ... and 6 more

  ❌ New (2 new issues):
    · complexity  Workflow "ButtonClicked [cmpvp]" now has 22 actions
    · security  New data type "payment" has no privacy rules
```

---

### `watch` — Auto Rescan on Change

Watches the `.bubble` file and re-runs the scan every time it changes.
Useful when you export repeatedly during a cleanup session.

```bash
bubble-detector watch --file <path> [options]
```

Accepts all the same options as `scan`. Press `Ctrl+C` to stop.

**Example:**

```bash
bubble-detector watch --file ./app.bubble --html
```

Every time you export a new version from Bubble, the scan runs automatically
and the HTML report is regenerated.

---

### `validate` — Check File Validity

Quickly checks if a file is a valid Bubble.io export.

```bash
bubble-detector validate <file>
```

**Example:**

```bash
bubble-detector validate ./my-app.bubble
# ✅ Valid Bubble app export
#    App ID:  my-app
#    Version: test
#    Pages:   18
#    Types:   53
```

---

### `init` — Generate Config File

Creates a `.bubblerc.json` configuration file in the current directory.

```bash
bubble-detector init
```

Then edit `.bubblerc.json` to configure rules, thresholds, and behavior.

---

## Understanding the Report

### Health Score

Every scan produces a **0–100 health score**:

```
  App Health Score: 🔴 54/100 — Poor — Significant refactoring needed

  Score Breakdown:
  • Dead Workflows       0/1120    0 pts
  • Dead DB Fields       0/749     0 pts
  • Inactive Plugins     8/8     -20 pts
  • Unused Styles        10/46    -2 pts
  • Unused Option Sets   48/68    -4 pts
  • Complexity Issues    21      -10 pts
  • Security Issues      3       -10 pts
```

| Score | Grade | Meaning |
|---|---|---|
| 90–100 | 🟢 Excellent | Clean and maintainable |
| 75–89 | 🟡 Good | Minor cleanup recommended |
| 55–74 | 🟠 Fair | Moderate technical debt |
| 35–54 | 🔴 Poor | Significant refactoring needed |
| 0–34 | ⚫ Critical | App is heavily bloated |

### Confidence Levels

Each finding has a confidence level:

| Level | Meaning |
|---|---|
| `HIGH` | Near-certain dead code — safe to act on |
| `MEDIUM` | Likely unused, but may be referenced dynamically |
| `LOW` | Informational hint — verify manually |

### What Each Rule Detects

| Rule ID | Severity | What it finds |
|---|---|---|
| `dead-workflow` | Error | Workflows with no triggering UI element |
| `dead-field` | Warning | Database fields with no static references |
| `dead-plugin` | Error | Installed plugins with no element or workflow usage |
| `dead-style` | Info | Styles not applied to any element |
| `dead-option-set` | Warning | Option sets not referenced in any expression |
| `complexity` | Warning | Workflows >15 actions, pages >200 elements |
| `security` | Error | Data types without privacy rules, exposed APIs |

---

## Full Workflow

This is the recommended workflow for cleaning up a Bubble app:

```
Step 1: Export your app
  Bubble editor → Settings → Export App → Download .bubble

Step 2: Run the audit
  bubble-detector scan --file ./app.bubble --html --json

Step 3: Review findings
  Open audit-results/audit-report.html in your browser
  Click on red nodes in the graph to inspect dead items

Step 4: Preview what can be auto-cleaned
  bubble-detector clean --file ./app.bubble --dry-run

Step 5: Auto-clean safe items
  bubble-detector clean --file ./app.bubble --only dead-plugin,dead-option-set,dead-style

Step 6: Handle the rest manually in Bubble
  - Workflows with no trigger → delete in Workflow tab
  - Fields with no references → delete in Data tab
  - Complexity warnings → split into smaller workflows

Step 7: Re-import the cleaned file
  Bubble editor → Settings → Import App → Upload cleaned .bubble

Step 8: Test your app
  Go through all critical user flows to ensure nothing broke

Step 9: Re-scan to verify improvement
  bubble-detector scan --file ./app-cleaned.bubble
  # Score should be higher now
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/bubble-audit.yml
name: Bubble App Health Check

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install detector
        run: npm install -g bubble-io-dead-code-detector

      - name: Run audit
        run: |
          bubble-detector scan \
            --file ./app.bubble \
            --sarif \
            --json \
            --output-dir ./audit-results \
            --fail-below 70

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ./audit-results/audit-report.sarif

      - name: Upload audit artifacts
        uses: actions/upload-artifact@v4
        with:
          name: bubble-audit
          path: ./audit-results/
```

> **Note:** Store your `.bubble` file as a GitHub secret or in a private repo.
> Never commit real `.bubble` files to public repositories.

---

## Configuration Reference

Run `bubble-detector init` to generate `.bubblerc.json`, then customize:

```json
{
  "$schema": "https://unpkg.com/bubble-io-dead-code-detector@latest/schemas/bubblerc.json",
  "ignore": {
    "workflows": ["wf_legacy_id"],
    "fields": ["user.deprecated_field_text"],
    "pages": ["admin_only"],
    "plugins": ["1604083196447x185573648335896580"]
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
      "maxPageElements": 200,
      "maxNestingDepth": 8
    },
    "security": {
      "enabled": true,
      "checkPrivacyRules": true,
      "checkExposedEndpoints": true
    }
  },
  "healthScore": {
    "failBelow": 70
  },
  "output": {
    "dir": "./audit-results",
    "formats": ["json", "html"]
  },
  "clean": {
    "backupDir": "./backups",
    "minConfidence": "HIGH",
    "requireConfirmation": true
  }
}
```

---

## FAQ

**Q: Is it safe to use the `clean` command?**

Yes, with caveats. The cleaner always:
1. Creates a timestamped backup before modifying anything
2. Only removes items where `safeToDelete = true`
3. Only removes items at or above your `--min-confidence` threshold (default: HIGH)
4. Supports `--dry-run` to preview changes before applying
5. Supports `--rollback` to restore the previous version

Start with `--dry-run` and `--only dead-plugin` before running broader cleans.

---

**Q: Will the cleaned `.bubble` file work if I import it back into Bubble?**

Yes — the cleaner only removes entries from the app's JSON structure that have
no references anywhere. The Bubble import process accepts any valid `.bubble` file.
Always test your app thoroughly after importing.

---

**Q: Some findings show MEDIUM confidence — should I delete those?**

MEDIUM confidence means the item *appears* unused in static analysis, but
Bubble allows dynamic field access (e.g., a field name constructed at runtime).
We recommend manually verifying MEDIUM findings before deleting them.
Use `--min-confidence HIGH` to only see the safest findings.

---

**Q: The health score seems low. Is my app broken?**

No. A score below 75 just means there's accumulated technical debt — this is
extremely common in apps that have been in active development. The score measures
structural cleanliness, not whether the app works correctly.

---

**Q: Can I ignore specific items I know are intentionally unused?**

Yes. Add them to the `ignore` section in `.bubblerc.json`:
```json
{
  "ignore": {
    "workflows": ["wf_legacy_migration_id"],
    "plugins": ["1604083196447x185573648335896580"]
  }
}
```

---

**Q: The `.bubble` file is large. Will the tool be slow?**

No. Even for large apps (10MB+ files, 10,000+ nodes), analysis typically
completes in under 200ms. The dependency graph is built once and reused
across all rules.

---

**Q: How often should I run the audit?**

We recommend:
- **Before major releases** — ensure you're not shipping unnecessary bloat
- **Monthly** — catch accumulating debt early
- **After major feature work** — verify cleanup was complete
- **Automatically in CI** — use `--fail-below` to enforce a minimum score
