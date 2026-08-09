/**
 * `diff` command — compare two Bubble app versions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { readBubbleFile, parseBubbleApp } from '../../parser/index.js';
import { analyzeApp, type AnalysisResult } from '../../analyzer/index.js';
import { loadConfig } from '../../config/config-loader.js';
import type { Finding } from '../../analyzer/rules/rule.interface.js';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Compare two .bubble exports and show what improved or regressed')
    .requiredOption('--before <path>', 'Older app version (.bubble file)')
    .requiredOption('--after <path>', 'Newer app version (.bubble file)')
    .option('--json', 'Export diff report as diff-report.json')
    .option('--output-dir <dir>', 'Output directory for reports', './audit-results')
    .action(async (options) => {
      await runDiff(options);
    });
}

async function runDiff(options: {
  before: string;
  after: string;
  json?: boolean;
  outputDir: string;
}): Promise<void> {
  const spinner = ora('Analyzing both versions...').start();

  try {
    const config = loadConfig();

    const [resultBefore, resultAfter] = await Promise.all([
      analyzeFile(options.before, config),
      analyzeFile(options.after, config),
    ]);

    spinner.succeed('Diff analysis complete');

    const diff = computeDiff(resultBefore, resultAfter);
    printDiffReport(diff, resultBefore, resultAfter);

    if (options.json) {
      const outputDir = resolve(options.outputDir);
      mkdirSync(outputDir, { recursive: true });
      const outputPath = join(outputDir, 'diff-report.json');
      writeFileSync(outputPath, JSON.stringify(diff, null, 2), 'utf-8');
      console.log(chalk.dim(`\n  📄 Diff JSON: ${outputPath}`));
    }
  } catch (err) {
    spinner.fail(chalk.red((err as Error).message));
    process.exit(1);
  }
}

async function analyzeFile(filePath: string, config: ReturnType<typeof loadConfig>): Promise<AnalysisResult> {
  const rawApp = readBubbleFile(filePath);
  const parsedApp = parseBubbleApp(rawApp);
  return analyzeApp(parsedApp, {
    rulesConfig: config.rules,
    ignore: {
      workflows: config.ignore?.workflows,
      fields: config.ignore?.fields,
      pages: config.ignore?.pages,
      plugins: config.ignore?.plugins,
    },
  });
}

interface DiffReport {
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  totalBefore: number;
  totalAfter: number;
  fixed: Array<{ ruleId: string; name: string; location: string }>;
  newIssues: Array<{ ruleId: string; name: string; location: string; severity: string }>;
  unchanged: number;
}

function computeDiff(before: AnalysisResult, after: AnalysisResult): DiffReport {
  const beforeMap = new Map(before.findings.map((f) => [findingKey(f), f]));
  const afterMap = new Map(after.findings.map((f) => [findingKey(f), f]));

  const fixed = before.findings
    .filter((f) => !afterMap.has(findingKey(f)))
    .map((f) => ({ ruleId: f.ruleId, name: f.location.name, location: f.location.parentName ?? '' }));

  const newIssues = after.findings
    .filter((f) => !beforeMap.has(findingKey(f)))
    .map((f) => ({ ruleId: f.ruleId, name: f.location.name, location: f.location.parentName ?? '', severity: f.severity }));

  const unchanged = after.findings.filter((f) => beforeMap.has(findingKey(f))).length;

  return {
    scoreBefore: before.healthScore.score,
    scoreAfter: after.healthScore.score,
    scoreDelta: after.healthScore.score - before.healthScore.score,
    totalBefore: before.findings.length,
    totalAfter: after.findings.length,
    fixed,
    newIssues,
    unchanged,
  };
}

function printDiffReport(diff: DiffReport, before: AnalysisResult, after: AnalysisResult): void {
  const scoreDeltaStr = diff.scoreDelta > 0
    ? chalk.green(`+${diff.scoreDelta}`)
    : diff.scoreDelta < 0
      ? chalk.red(String(diff.scoreDelta))
      : chalk.dim('±0');

  console.log('');
  console.log(chalk.bold('  ════════════════════════════════════════════'));
  console.log(chalk.bold('  🫧  Bubble App Diff Report'));
  console.log(chalk.bold('  ════════════════════════════════════════════'));
  console.log('');
  console.log(`  Health Score:  ${chalk.bold(String(diff.scoreBefore))} → ${chalk.bold(String(diff.scoreAfter))}  (${scoreDeltaStr} points)`);
  console.log(`  Total Issues:  ${diff.totalBefore} → ${diff.totalAfter}`);
  console.log('');

  if (diff.fixed.length > 0) {
    console.log(chalk.green.bold(`  ✅ Fixed — ${diff.fixed.length} issue(s) resolved:`));
    for (const item of diff.fixed.slice(0, 10)) {
      console.log(chalk.green(`    ✓ [${item.ruleId}] ${item.name}${item.location ? ` (${item.location})` : ''}`));
    }
    if (diff.fixed.length > 10) console.log(chalk.dim(`    ... and ${diff.fixed.length - 10} more`));
    console.log('');
  }

  if (diff.newIssues.length > 0) {
    console.log(chalk.red.bold(`  ❌ New — ${diff.newIssues.length} issue(s) introduced:`));
    for (const item of diff.newIssues.slice(0, 10)) {
      const sev = item.severity === 'error' ? chalk.red('ERR') : item.severity === 'warning' ? chalk.yellow('WRN') : chalk.dim('INF');
      console.log(`    ${sev} [${item.ruleId}] ${item.name}${item.location ? ` (${item.location})` : ''}`);
    }
    if (diff.newIssues.length > 10) console.log(chalk.dim(`    ... and ${diff.newIssues.length - 10} more`));
    console.log('');
  }

  if (diff.fixed.length === 0 && diff.newIssues.length === 0) {
    console.log(chalk.dim('  No changes in findings between the two versions.'));
    console.log('');
  }

  console.log(chalk.dim(`  Unchanged: ${diff.unchanged} issues persist in both versions`));
  console.log('');

  // Verdict
  if (diff.scoreDelta > 0) {
    console.log(chalk.green.bold(`  ✅ App quality improved by ${diff.scoreDelta} points`));
  } else if (diff.scoreDelta < 0) {
    console.log(chalk.red.bold(`  ⚠ App quality regressed by ${Math.abs(diff.scoreDelta)} points`));
  } else {
    console.log(chalk.dim('  App quality unchanged between versions'));
  }
  console.log('');
}

function findingKey(f: Finding): string {
  return `${f.ruleId}::${f.location.id}`;
}
