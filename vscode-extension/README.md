# Bubble.io Dead Code Detector — VS Code Extension

Detects dead code, unused plugins, fields, and styles in Bubble.io app exports.

## Features

- **Right-click** any `.bubble` file in the Explorer → **"Bubble: Run Dead Code Scan"**
- Findings appear in the **VS Code Problems panel** (Errors/Warnings/Info)
- **HTML visual graph report** opens automatically in your browser
- **Health score** shown in notification (0–100)
- **Dry-run clean preview** — see what can be safely removed

## Usage

1. Install the extension
2. Open a folder containing your `.bubble` file
3. Right-click the `.bubble` file → **"Bubble: Run Dead Code Scan"**

Or use the Command Palette (`Ctrl+Shift+P`):
- `Bubble: Run Dead Code Scan`
- `Bubble: Scan + Open HTML Report`
- `Bubble: Clean (dry-run preview)`

## Requirements

- **Node.js 18+** must be installed and on your PATH
- `bubble-io-dead-code-detector` npm package (installed automatically as a dependency)

## Settings

| Setting | Default | Description |
|---|---|---|
| `bubbleDetector.minConfidence` | `MEDIUM` | Minimum confidence level to show |
| `bubbleDetector.outputDir` | `./audit-results` | Where to save reports |
| `bubbleDetector.autoOpenHtml` | `true` | Open HTML report automatically |

## Publishing to VS Code Marketplace

```bash
# Prerequisites: Microsoft account at https://dev.azure.com
cd vscode-extension
npm install
npm install -g @vscode/vsce

# Create publisher (first time only)
vsce create-publisher <your-publisher-name>

# Package as .vsix (local install)
vsce package
# → Installs locally: Ctrl+Shift+P → "Install from VSIX"

# Publish to Marketplace
vsce publish
```

## Development

```bash
cd vscode-extension
npm install
npm run compile       # Build once
npm run watch         # Rebuild on change

# Test in VS Code:
# Press F5 to open an Extension Development Host window
```
