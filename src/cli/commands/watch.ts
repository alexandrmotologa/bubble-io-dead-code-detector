/**
 * `watch` command — auto re-scan on .bubble file change
 */

import { Command } from 'commander';
import { watch as fsWatch } from 'fs';
import { resolve, basename } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readBubbleFile, parseBubbleApp } from '../../parser/index.js';
import { analyzeApp } from '../../analyzer/index.js';
import { printConsoleReport } from '../../reporters/console-reporter.js';
import { writeHtmlReport } from '../../reporters/html-reporter.js';
import { writeJsonReport } from '../../reporters/json-reporter.js';
import { loadConfig } from '../../config/config-loader.js';
import type { Finding } from '../../analyzer/rules/rule.interface.js';

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description('Watch a .bubble file and re-scan automatically on every change')
    .requiredOption('-f, --file <path>', 'Path to the .bubble export file')
    .option('--html', 'Regenerate HTML graph on every scan')
    .option('--json', 'Regenerate JSON report on every scan')
    .option('--output-dir <dir>', 'Output directory for reports', './audit-results')
    .option('--only <rules>', 'Run only specific rules (comma-separated)')
    .option('--min-confidence <level>', 'Minimum confidence: HIGH|MEDIUM|LOW', 'LOW')
    .action(async (options) => {
      await runWatch(options);
    });
}

async function runWatch(options: {
  file: string;
  html?: boolean;
  json?: boolean;
  outputDir: string;
  only?: string;
  minConfidence?: string;
}): Promise<void> {
  const filePath = resolve(options.file);
  const fileName = basename(filePath);

  console.log(chalk.magenta.bold('\n  🫧 bubble-io-dead-code-detector — Watch Mode'));
  console.log(chalk.dim(`  Watching: ${filePath}`));
  console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

  let previousFindings: Finding[] = [];
  let scanCount = 0;

  const runScan = async () => {
    scanCount++;
    const spinner = ora(`[Scan #${scanCount}] Reading ${fileName}...`).start();

    try {
      const config = loadConfig();
      const rawApp = readBubbleFile(filePath);
      const parsedApp = parseBubbleApp(rawApp);

      const only = options.only ? options.only.split(',').map((s) => s.trim()) : undefined;
      const minConf = (options.minConfidence as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'LOW';

      const result = analyzeApp(parsedApp, {
        rulesConfig: config.rules,
        only,
        minConfidence: minConf,
        ignore: {
          workflows: config.ignore?.workflows,
          fields: config.ignore?.fields,
          pages: config.ignore?.pages,
          plugins: config.ignore?.plugins,
        },
      });

      spinner.succeed(
        chalk.green(`[Scan #${scanCount}] ${result.findings.length} issues — score: ${result.healthScore.score}/100 (${result.healthScore.grade})`),
      );

      // Show delta vs previous scan
      if (scanCount > 1) {
        printDelta(previousFindings, result.findings);
      }

      printConsoleReport(result);

      const outputDir = resolve(options.outputDir);
      if (options.html) writeHtmlReport(result, outputDir);
      if (options.json) writeJsonReport(result, outputDir);

      previousFindings = result.findings;
    } catch (err) {
      spinner.fail(chalk.red(`[Scan #${scanCount}] Error: ${(err as Error).message}`));
    }
  };

  // Run immediately on start
  await runScan();

  // Debounced watcher — avoid multiple triggers on same save
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = fsWatch(filePath, (_event) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(chalk.yellow(`\n  📁 File changed — re-scanning...\n`));
      await runScan();
    }, 500);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.dim('\n  Watch mode stopped.'));
    process.exit(0);
  });

  // Keep the process alive
  await new Promise(() => {}); // eslint-disable-line @typescript-eslint/no-empty-function
}

function printDelta(previous: Finding[], current: Finding[]): void {
  const prevKeys = new Set(previous.map(findingKey));
  const currKeys = new Set(current.map(findingKey));

  const fixed = previous.filter((f) => !currKeys.has(findingKey(f)));
  const newIssues = current.filter((f) => !prevKeys.has(findingKey(f)));

  if (fixed.length > 0) {
    console.log(chalk.green(`  ✅ ${fixed.length} issue(s) fixed since last scan`));
    fixed.slice(0, 3).forEach((f) => console.log(chalk.green(`    ✓ [${f.ruleId}] ${f.location.name}`)));
  }
  if (newIssues.length > 0) {
    console.log(chalk.red(`  ❌ ${newIssues.length} new issue(s) since last scan`));
    newIssues.slice(0, 3).forEach((f) => console.log(chalk.red(`    ✗ [${f.ruleId}] ${f.location.name}`)));
  }
  if (fixed.length === 0 && newIssues.length === 0) {
    console.log(chalk.dim('  → No changes in findings since last scan'));
  }
  console.log('');
}

function findingKey(f: Finding): string {
  return `${f.ruleId}::${f.location.id}`;
}
