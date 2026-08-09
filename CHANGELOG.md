# Changelog

All notable changes to `bubble-io-dead-code-detector` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-09

### Added

#### Core Engine
- **`ignore` filter** — `.bubblerc.json` `ignore` lists are now fully wired to all 5 dead-code rules. Items in `ignore.workflows`, `ignore.fields`, `ignore.plugins`, `ignore.optionSets`, `ignore.styles` are silently skipped during analysis.
- **Dynamic field confidence** — fields belonging to data types that appear in Search expressions are now downgraded from `HIGH` → `MEDIUM` confidence, preventing false positives on types where fields may be accessed dynamically.
- **Plugin name registry** — 60+ popular Bubble plugin IDs are now mapped to human-readable names (`Ionic Elements`, `Stripe`, `Google Maps`, etc.). Reports now show plugin names instead of raw numeric IDs.

#### New CLI Commands
- **`watch`** — Auto re-scans a `.bubble` file whenever it changes on disk. Shows delta (fixed / new issues) between scans. Uses Node.js built-in `fs.watch()` — zero new dependencies.
- **`diff`** — Compares two `.bubble` exports and reports: health score delta, fixed issues, new issues, unchanged count. Supports `--json` output.

#### Extended `clean` — Opt-In Targets
- **`--only dead-plugin`** — Removes inactive plugins from `settings.client_safe.plugins`
- **`--only dead-option-set`** — Removes unused option sets from `option_sets`
- **`--only dead-style`** — Removes unused styles from `styles`

All targets are fully opt-in. None apply by default. Dry-run + backup always enforced.

#### Reports
- **CSV** — New `--csv` flag exports `audit-report.csv` for Excel / Google Sheets

#### VS Code Extension
- Scaffolded at `vscode-extension/` — right-click `.bubble` files to scan, findings in Problems panel, HTML report auto-opens in browser

#### Documentation
- `USAGE.md` — Full English usage guide: how to export a `.bubble` file, all CLI commands, workflow guide, CI/CD integration, FAQ

#### Tests
- 8 new tests: ignore filter, isIgnored helper, CSV output, plugin registry lookup
- **Total: 19 tests — all passing**

## [1.0.0] - 2026-08-09

### Added

#### Core Engine
- Full `.bubble` app export parser — supports all Bubble.io structural types
- Directed dependency graph (DAG) with 10 node kinds: `page`, `element`, `workflow`, `api_workflow`, `data_type`, `field`, `option_set`, `style`, `plugin`, `reusable_element`
- Recursive Bubble expression tree traversal to extract all data, field, element, option set, and style references
- Graph-based orphan detection (zero incoming edges = dead code candidate)

#### Analysis Rules
- `dead-workflow` — Detects UI workflows with no triggering element
- `dead-field` — Detects database fields with no static references
- `dead-plugin` — Detects installed plugins with no element or workflow usage
- `dead-style` — Detects styles not applied to any element
- `dead-option-set` — Detects option sets not referenced in any expression
- `complexity` — Flags workflows >15 actions, pages >200 elements, deep nesting >8 levels
- `security` — Detects sensitive data types without privacy rules, exposed API endpoints

#### Health Scoring
- Weighted 0-100 health score with 5 grade levels (excellent → critical)
- Per-category penalty breakdown in console and all reports

#### CLI Commands
- `scan` — Full audit with configurable output formats
- `clean` — Safe dead code removal with mandatory backup
- `validate` — Quick file validation
- `init` — Generate `.bubblerc.json` configuration

#### Interactive TUI
- `@clack/prompts`-powered interactive mode when run with no arguments
- Step-by-step file selection, action choice, and output directory

#### Reports
- **Console** — Rich chalk-based color output with grouped findings
- **JSON** — Machine-readable `audit-report.json`
- **Markdown** — Notion/Confluence-ready `audit-report.md`
- **HTML** — Standalone interactive visual graph (`audit-report.html`) using Vis.js
- **SARIF 2.1** — `audit-report.sarif` for GitHub Code Scanning, GitLab SAST, Azure DevOps

#### Cleaner
- Mandatory timestamped backup before any modification
- Dry-run mode (default)
- Confidence gate (HIGH by default)
- Interactive confirmation via `@clack/prompts`
- Rollback support via `--rollback`

#### Configuration
- `.bubblerc.json` with Zod validation
- Per-rule enable/disable and severity override
- `healthScore.failBelow` for CI threshold
- `ignore` lists for workflows, fields, pages, plugins

#### Documentation
- `docs/architecture.md` — Full system design with layer descriptions
- `docs/contributing.md` — Project structure and custom rule guide
- `docs/custom-rules.md` — Step-by-step rule writing tutorial
- `docs/bubble-schema.md` — `.bubble` file format reference (reverse-engineered)

### Technical
- Built with TypeScript 5.8 in strict mode
- ESM-only output (Node.js 18+)
- Zero runtime TypeScript dependencies — pure JavaScript output
- 11 unit tests with Vitest
- SARIF 2.1 compliant output
