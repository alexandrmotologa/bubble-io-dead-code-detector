/**
 * `scan` command — full app audit
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { resolve } from 'path';
import { readBubbleFile, parseBubbleApp } from '../../parser/index.js';
import { analyzeApp } from '../../analyzer/index.js';
import { printConsoleReport } from '../../reporters/console-reporter.js';
import { writeJsonReport } from '../../reporters/json-reporter.js';
import { writeMarkdownReport } from '../../reporters/markdown-reporter.js';
import { writeHtmlReport } from '../../reporters/html-reporter.js';
import { writeSarifReport } from '../../reporters/sarif-reporter.js';
import { loadConfig } from '../../config/config-loader.js';

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Run a full dead code and health audit on a Bubble app export')
    .requiredOption('-f, --file <path>', 'Path to the .bubble export file')
    .option('--json', 'Export machine-readable audit-report.json')
    .option('--html', 'Generate interactive HTML visual graph report')
    .option('--markdown', 'Generate Notion/Confluence-ready Markdown report')
    .option('--sarif', 'Export SARIF report for CI/CD (GitHub Actions, GitLab CI)')
    .option('--output-dir <dir>', 'Output directory for reports', './audit-results')
    .option('--only <rules>', 'Run only specific rules (comma-separated: dead-workflow,dead-field,...)')
    .option('--min-confidence <level>', 'Minimum confidence level to report: HIGH|MEDIUM|LOW', 'LOW')
    .option('--fail-below <score>', 'Exit with code 1 if health score is below this threshold')
    .action(async (options) => {
      await runScan(options);
    });
}

async function runScan(options: {
  file: string;
  json?: boolean;
  html?: boolean;
  markdown?: boolean;
  sarif?: boolean;
  outputDir: string;
  only?: string;
  minConfidence?: string;
  failBelow?: string;
}): Promise<void> {
  const spinner = ora('Reading Bubble app export...').start();

  try {
    // Load config
    const config = loadConfig();

    // Read & parse
    spinner.text = 'Parsing .bubble file...';
    const rawApp = readBubbleFile(options.file);
    const parsedApp = parseBubbleApp(rawApp);

    // Analyze
    spinner.text = 'Building dependency graph...';
    const only = options.only ? options.only.split(',').map((s) => s.trim()) : undefined;
    const minConf = (options.minConfidence as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'LOW';

    spinner.text = 'Running analysis rules...';
    const result = analyzeApp(parsedApp, {
      rulesConfig: config.rules,
      only,
      minConfidence: minConf,
    });

    spinner.succeed(
      chalk.green(
        `Analysis complete — ${result.findings.length} issues found in ${result.analysisDurationMs}ms`,
      ),
    );

    // Print console report
    printConsoleReport(result);

    // Generate requested output formats
    const outputDir = resolve(options.outputDir);
    const generated: string[] = [];

    if (options.json) {
      const p = writeJsonReport(result, outputDir);
      generated.push(chalk.dim(`  📄 JSON: ${p}`));
    }

    if (options.html) {
      const p = writeHtmlReport(result, outputDir);
      generated.push(chalk.dim(`  🌐 HTML: ${p}`));
    }

    if (options.markdown) {
      const p = writeMarkdownReport(result, outputDir);
      generated.push(chalk.dim(`  📝 Markdown: ${p}`));
    }

    if (options.sarif) {
      const p = writeSarifReport(result, outputDir);
      generated.push(chalk.dim(`  📋 SARIF: ${p}`));
    }

    if (generated.length > 0) {
      console.log(chalk.bold('  Reports generated:'));
      generated.forEach((g) => console.log(g));
      console.log('');
    }

    // Exit code check
    const failBelow = options.failBelow ? parseInt(options.failBelow) : config.healthScore?.failBelow;
    if (failBelow !== undefined && result.healthScore.score < failBelow) {
      console.log(
        chalk.red.bold(
          `  ✖ Health score ${result.healthScore.score} is below threshold ${failBelow} — failing`,
        ),
      );
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red((err as Error).message));
    process.exit(1);
  }
}
