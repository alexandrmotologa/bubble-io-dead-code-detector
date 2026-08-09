# Bubble.io Dead Code Detector — Complete Usage Guide

> A step-by-step walkthrough for every feature of `bubble-io-dead-code-detector`.

---

## Table of Contents

1. [Getting Your .bubble File](#1-getting-your-bubble-file)
2. [VS Code Extension (No Terminal Required)](#2-vs-code-extension-no-terminal-required)
3. [CLI Installation](#3-cli-installation)
4. [First Scan](#4-first-scan)
5. [Understanding the Report](#5-understanding-the-report)
6. [All Report Formats](#6-all-report-formats)
7. [Watch Mode — Auto Re-Scan](#7-watch-mode--auto-re-scan)
8. [Diff — Compare Two Versions](#8-diff--compare-two-versions)
9. [Clean — Removing Dead Code](#9-clean--removing-dead-code)
10. [Configuration File (.bubblerc.json)](#10-configuration-file-bubblercjson)
11. [Ignoring False Positives](#11-ignoring-false-positives)
12. [CI/CD Integration](#12-cicd-integration)
13. [FAQ](#13-faq)

---

## 1. Getting Your `.bubble` File

The tool works on exported `.bubble` files — a JSON snapshot of your entire Bubble app.

**Step-by-step:**

1. Open your app in the **Bubble editor**
2. Click **Settings** in the left sidebar
3. Scroll to the **Export App** section
4. Click **Export** — the file downloads as `your-app-name.bubble`
5. Save it somewhere accessible (e.g., your Desktop or project folder)

> ⚠️ **Security:** The `.bubble` file contains your full app structure, API keys in workflows, and database schema. **Never commit it to a public Git repository.**

---

## 2. VS Code Extension (No Terminal Required)

The VS Code extension is the easiest way to use this tool — no terminal or CLI knowledge needed.

### Installation

**Method 1 — From VS Code UI:**
1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac) to open Extensions
3. Search for: **Bubble.io Dead Code Detector**
4. Click **Install**

**Method 2 — Direct link:**
Visit the [VS Code Marketplace page](https://marketplace.visualstudio.com/items?itemName=alexandrmotologa.bubble-dead-code-detector-vscode) and click **Install**.

**Method 3 — Terminal:**
```bash
code --install-extension alexandrmotologa.bubble-dead-code-detector-vscode
```

### Running a Scan

1. Open VS Code
2. Open the folder that contains your `.bubble` file (`File → Open Folder`)
3. In the **Explorer panel** (left sidebar), find your `.bubble` file
4. **Right-click** on the file
5. Select **"Bubble: Run Dead Code Scan"**

That's it. The extension will:
- Analyze your app (takes 1–5 seconds depending on app size)
- Show a notification with the health score: `🫧 Bubble Scan: 90 issues — Score 54/100 (Poor)`
- Populate the **Problems panel** with all findings
- Open the **HTML visual report** in your browser automatically

### Viewing Results

**Problems Panel:**
- Press `Ctrl+Shift+M` to open the Problems panel
- Every finding appears as an Error, Warning, or Info item
- Each item shows the rule ID and message

**HTML Report:**
- Opens automatically in your default browser
- Interactive dependency graph — click on nodes to see connections
- Filter by severity and rule type

### Available Commands

Open the Command Palette with `Ctrl+Shift+P` and type "Bubble":

| Command | Description |
|---|---|
| **Bubble: Run Dead Code Scan** | Full scan, results in Problems panel |
| **Bubble: Scan + Open HTML Report** | Same, always opens HTML report |
| **Bubble: Clean (dry-run preview)** | Shows what can be safely removed (no changes made) |

### Extension Settings

Go to `File → Preferences → Settings` and search for "Bubble":

| Setting | Default | Description |
|---|---|---|
| `bubbleDetector.minConfidence` | `MEDIUM` | `HIGH` = fewer, more certain findings. `LOW` = all findings including uncertain ones |
| `bubbleDetector.outputDir` | `./audit-results` | Folder where reports (JSON, HTML) are saved |
| `bubbleDetector.autoOpenHtml` | `true` | Set to `false` to stop the HTML report from opening automatically |

### Prerequisites for the Extension

The extension internally calls the CLI tool. You need:
- **Node.js 18+** installed on your system ([download here](https://nodejs.org))
- The `bubble-io-dead-code-detector` npm package installed:

```bash
npm install -g bubble-io-dead-code-detector
```

---

## 3. CLI Installation

### Requirements

- **Node.js 18 or higher** — [download here](https://nodejs.org)
- npm (comes with Node.js)

### Check your Node.js version

```bash
node --version
# Should print v18.0.0 or higher
```

### Install the CLI

```bash
npm install -g bubble-io-dead-code-detector
```

### Verify installation

```bash
bubble-detector --version
# Should print: 1.1.0
```

---

## 4. First Scan

### Interactive Mode (Recommended for Beginners)

Run with no arguments to launch the interactive TUI (Terminal UI):

```bash
bubble-detector
```

Follow the prompts — select your file, choose options, and the tool runs the scan for you.

### Command Line Mode

```bash
bubble-detector scan --file ./your-app.bubble
```

**Example output:**
```
╔══════════════════════════════════════════════════════════╗
║  🫧  Bubble.io Dead Code Detector — Audit Report         ║
╚══════════════════════════════════════════════════════════╝

  App ID:      my-saas-app
  Version:     live
  Scanned in:  52ms

  App Health Score: 🔴 54/100 — Poor — Significant refactoring needed

  Score Breakdown:
  • Dead Workflows       0pts
  • Dead DB Fields       0pts
  • Inactive Plugins     8 plugins  -20pts
  • Unused Styles        10 styles  -2pts
  • Unused Option Sets   48 sets    -4pts
  • Complexity Issues    21         -10pts
  • Security Issues      3          -10pts

  Found 90 issues: 11 errors, 65 warnings, 14 info
```

---

## 5. Understanding the Report

### Health Score

| Score | Grade | What it means |
|---|---|---|
| 90–100 | 🟢 Excellent | Clean, well-maintained app |
| 75–89 | 🟡 Good | Minor cleanup recommended |
| 55–74 | 🟠 Fair | Moderate technical debt — worth cleaning |
| 35–54 | 🔴 Poor | Significant bloat — clean as soon as possible |
| 0–34 | 🔴 Critical | App is heavily bloated — immediate action needed |

### Severity Levels

- **Error** — High priority. Likely a real problem (e.g., dead workflow, inactive plugin)
- **Warning** — Should be investigated (e.g., unused field, option set)
- **Info** — Low priority. May be intentional (e.g., unused style)

### Confidence Levels

- **HIGH** — Very likely to be dead code. Safe to delete
- **MEDIUM** — Probably dead, but may be used dynamically. Verify before deleting
- **LOW** — Uncertain. Manual review required

### Rules Explained

| Rule | What it detects | Safe to auto-delete? |
|---|---|---|
| `dead-workflow` | Workflows with no trigger element | ✅ Yes (if 0 actions) |
| `dead-field` | DB fields not referenced anywhere | ⚠️ Verify first |
| `dead-plugin` | Plugins with no UI elements or workflow actions | ✅ Yes |
| `dead-style` | Styles not applied to any element | ✅ Yes |
| `dead-option-set` | Option sets not used in conditions/dropdowns | ✅ Yes |
| `complexity` | Workflows with >15 actions, pages with >200 elements | ❌ Manual refactor |
| `security` | Data types with sensitive data but no privacy rules | ❌ Manual fix in Bubble |

---

## 6. All Report Formats

Generate multiple formats in a single scan:

```bash
bubble-detector scan --file ./app.bubble \
  --json \
  --html \
  --markdown \
  --csv \
  --sarif \
  --output-dir ./audit-results
```

| Format | File | Best for |
|---|---|---|
| HTML | `audit-report.html` | Visual review — interactive dependency graph |
| JSON | `audit-report.json` | Scripts, CI pipelines, integrations |
| Markdown | `audit-report.md` | Pasting into Notion, Confluence, GitHub issues |
| CSV | `audit-report.csv` | Excel, Google Sheets — share with non-developers |
| SARIF | `audit-report.sarif` | GitHub Code Scanning, GitLab SAST |

### Open the HTML Report

After scanning with `--html`:
```bash
# The path is printed in the terminal output, e.g.:
start audit-results/audit-report.html   # Windows
open audit-results/audit-report.html    # macOS
xdg-open audit-results/audit-report.html # Linux
```

---

## 7. Watch Mode — Auto Re-Scan

Watch mode monitors your `.bubble` file and automatically re-scans whenever you export a new version from Bubble.

```bash
bubble-detector watch --file ./app.bubble
```

**With HTML report regeneration:**
```bash
bubble-detector watch --file ./app.bubble --html
```

**Workflow:**
1. Start watch mode in your terminal
2. Work on your Bubble app
3. Export a new `.bubble` file (overwrites the old one)
4. The tool detects the change and re-scans automatically
5. You see a **delta report**: which issues were fixed and which are new

**Example delta output:**
```
📁 File changed — re-scanning...

[Scan #2] 85 issues — score: 59/100 (Fair)
  ✅ 5 issues fixed since last scan
    ✓ [dead-plugin] Ionic Elements
    ✓ [dead-style] cmMgb
  ❌ 0 new issues since last scan
```

**Stop watch mode:** Press `Ctrl+C`

---

## 8. Diff — Compare Two Versions

Compare two `.bubble` exports to see how your app quality changed over time.

```bash
bubble-detector diff --before ./app-v1.bubble --after ./app-v2.bubble
```

**Example output:**
```
════════════════════════════════════════════
🫧  Bubble App Diff Report
════════════════════════════════════════════

Health Score:  54 → 71  (+17 points)
Total Issues:  90 → 63

✅ Fixed — 27 issue(s) resolved:
  ✓ [dead-plugin] Ionic Elements
  ✓ [dead-plugin] AddToAny
  ✓ [dead-option-set] stripe badge
  ... and 24 more

❌ New — 0 issue(s) introduced

Unchanged: 63 issues persist in both versions

✅ App quality improved by 17 points
```

**Export diff as JSON:**
```bash
bubble-detector diff --before ./v1.bubble --after ./v2.bubble --json --output-dir ./audit
```

---

## 9. Clean — Removing Dead Code

The `clean` command removes dead code from your `.bubble` file automatically.

> ⚠️ **Always use `--dry-run` first.** The tool creates a backup automatically, but review before committing.

### Step 1 — Always start with a dry run

```bash
bubble-detector clean --file ./app.bubble --dry-run --min-confidence MEDIUM
```

This shows exactly what would be removed — **no changes are made to the file.**

### Step 2 — Target specific types

```bash
# Remove only inactive plugins
bubble-detector clean --file ./app.bubble --dry-run --only dead-plugin

# Remove unused option sets and styles
bubble-detector clean --file ./app.bubble --dry-run --only dead-option-set,dead-style

# Remove all (plugins, option sets, styles)
bubble-detector clean --file ./app.bubble --dry-run --only dead-plugin,dead-option-set,dead-style
```

### Step 3 — Apply the clean (when satisfied with dry run)

```bash
bubble-detector clean --file ./app.bubble \
  --only dead-plugin,dead-option-set,dead-style \
  --min-confidence MEDIUM \
  --output ./app-cleaned.bubble
```

The tool will:
1. Create a timestamped backup: `./backups/app.2026-08-09T19-00-00.bubble.bak`
2. Remove the dead code
3. Write the cleaned file to `./app-cleaned.bubble`
4. Print a summary of what was removed

### Step 4 — Import back into Bubble

1. Go to **Bubble editor → Settings → Import App**
2. Upload `./app-cleaned.bubble`
3. Verify your app works as expected

### Rollback if needed

```bash
bubble-detector clean --file ./app.bubble --rollback
```

Restores from the most recent `.bubble.bak` backup.

---

## 10. Configuration File (`.bubblerc.json`)

The config file lets you save your preferences so you don't repeat CLI flags.

### Generate a config file

```bash
bubble-detector init
```

This creates `.bubblerc.json` in the current directory. Example:

```json
{
  "$schema": "https://unpkg.com/bubble-io-dead-code-detector@latest/schemas/bubblerc.json",
  "ignore": {
    "workflows": [],
    "fields": [],
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
  "clean": {
    "backupDir": "./backups",
    "minConfidence": "HIGH",
    "requireConfirmation": true
  }
}
```

The tool automatically reads `.bubblerc.json` from the current directory when you run any command.

---

## 11. Ignoring False Positives

Sometimes the tool flags items that are actually used (e.g., accessed dynamically via expressions). Add them to the `ignore` list in `.bubblerc.json`:

```json
{
  "ignore": {
    "workflows": [
      "legacy-migration-workflow-id",
      "my-background-scheduler"
    ],
    "fields": [
      "temp_session_data",
      "external_sync_key"
    ],
    "plugins": [
      "1476822950457x632962508451020800"
    ],
    "optionSets": [
      "internal-config-flags"
    ],
    "styles": [
      "theme-override-global"
    ]
  }
}
```

Ignored items will be silently skipped in all future scans.

---

## 12. CI/CD Integration

### GitHub Actions

```yaml
name: Bubble App Quality Check
on:
  push:
    paths: ['*.bubble']
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install bubble-detector
        run: npm install -g bubble-io-dead-code-detector

      - name: Run audit
        run: |
          bubble-detector scan \
            --file ./app.bubble \
            --sarif \
            --json \
            --output-dir ./audit-results \
            --fail-below 70

      - name: Upload SARIF to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ./audit-results/audit-report.sarif

      - name: Upload audit artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bubble-audit-report
          path: ./audit-results/
```

### GitLab CI

```yaml
bubble-audit:
  image: node:20
  script:
    - npm install -g bubble-io-dead-code-detector
    - bubble-detector scan --file ./app.bubble --sarif --json --fail-below 70
  artifacts:
    reports:
      sast: audit-results/audit-report.sarif
    paths:
      - audit-results/
```

---

## 13. FAQ

**Q: The tool says a workflow is dead, but it IS used. Why?**

A: The tool parses the static JSON export. If a workflow is triggered dynamically (via JavaScript `Trigger a custom event`) or via a Plugin action that isn't in the export, it may appear as dead. Add it to the `ignore` list in `.bubblerc.json`.

---

**Q: My `.bubble` file is very large (50MB+). Will it work?**

A: Yes. The parser is designed for large apps. A 50MB file typically analyzes in under 2 seconds.

---

**Q: Is it safe to use the `clean` command on my production app?**

A: Always export a fresh `.bubble` file, use `--dry-run` first, verify the output file in a test environment before importing to production. The tool creates a timestamped backup automatically, but extra caution is always recommended.

---

**Q: The VS Code extension says "Bubble Scan failed". What do I do?**

A: 
1. Check that Node.js 18+ is installed: `node --version`
2. Check that the CLI is installed: `bubble-detector --version`
3. Open the VS Code Output panel (`View → Output` → select "Bubble Dead Code Detector") for detailed error messages

---

**Q: Can I run multiple rules and ignore others?**

A: Yes, use `--only` to run specific rules:
```bash
bubble-detector scan --file ./app.bubble --only dead-plugin,dead-style
```

Or disable rules in `.bubblerc.json`:
```json
{
  "rules": {
    "complexity": { "enabled": false }
  }
}
```

---

**Q: How do I uninstall the CLI?**

```bash
npm uninstall -g bubble-io-dead-code-detector
```

---

**Q: How do I update to the latest version?**

```bash
npm update -g bubble-io-dead-code-detector
bubble-detector --version
```
