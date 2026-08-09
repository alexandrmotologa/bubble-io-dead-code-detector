/**
 * `clean` command — safe dead code removal
 */

import { Command } from 'commander';
import * as clack from '@clack/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'path';
import { existsSync, copyFileSync } from 'fs';
import { readBubbleFile, parseBubbleApp } from '../../parser/index.js';
import { analyzeApp } from '../../analyzer/index.js';
import { cleanBubbleApp, findLatestBackup } from '../../cleaner/index.js';
import { loadConfig } from '../../config/config-loader.js';

export function registerCleanCommand(program: Command): void {
  program
    .command('clean')
    .description('Remove verified-safe dead code from a Bubble app export (with mandatory backup)')
    .requiredOption('-f, --file <path>', 'Path to the .bubble export file')
    .option('-o, --output <path>', 'Output path for cleaned file', './cleaned-app.bubble')
    .option('--backup-dir <dir>', 'Directory to store backups', './backups')
    .option('--dry-run', 'Preview what would be removed without making changes')
    .option('--force', 'Skip interactive confirmation (use with caution!)')
    .option('--min-confidence <level>', 'Minimum confidence for auto-delete: HIGH|MEDIUM|LOW', 'HIGH')
    .option('--only <rules>', 'Only clean specific rule findings (comma-separated)')
    .option('--rollback', 'Restore from the latest backup')
    .action(async (options) => {
      if (options.rollback) {
        await runRollback(options.backupDir ?? './backups');
        return;
      }
      await runClean(options);
    });
}

async function runRollback(backupDir: string): Promise<void> {
  const latest = findLatestBackup(backupDir);
  if (!latest) {
    console.log(chalk.red('  ✖ No backup found in ' + backupDir));
    process.exit(1);
  }
  console.log(chalk.yellow(`  ↩ Rolling back from: ${latest}`));
  // Rollback = copy backup over current file (user must specify target)
  console.log(chalk.green('  ✅ Backup file: ' + latest));
  console.log(chalk.dim('  Copy this file to your desired location to restore.'));
}

async function runClean(options: {
  file: string;
  output: string;
  backupDir: string;
  dryRun?: boolean;
  force?: boolean;
  minConfidence?: string;
  only?: string;
}): Promise<void> {
  const isDryRun = options.dryRun ?? false;
  const config = loadConfig();

  // ─── Scan first ─────────────────────────────────────────────────────────────
  const spinner = ora('Analyzing app for safe-to-delete items...').start();

  let result;
  try {
    const rawApp = readBubbleFile(options.file);
    const parsedApp = parseBubbleApp(rawApp);
    result = analyzeApp(parsedApp);
    spinner.succeed('Analysis complete');
  } catch (err) {
    spinner.fail((err as Error).message);
    process.exit(1);
  }

  const minConf = (options.minConfidence as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'HIGH';
  const only = options.only ? options.only.split(',').map((s) => s.trim()) : undefined;
  const safeItems = result.findings.filter(
    (f) =>
      f.safeToDelete &&
      confidenceOrder(f.confidence) <= confidenceOrder(minConf) &&
      (!only || only.includes(f.ruleId)),
  );

  if (safeItems.length === 0) {
    console.log(
      chalk.yellow(
        `  ⚠ No items qualify for safe auto-deletion at confidence level: ${minConf}`,
      ),
    );
    console.log(
      chalk.dim(
        '  Lower --min-confidence to MEDIUM or manually review findings in the HTML report.',
      ),
    );
    return;
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold.yellow(`  ⚠  About to ${isDryRun ? '[DRY-RUN] ' : ''}clean ${safeItems.length} items:`));
  for (const f of safeItems.slice(0, 10)) {
    console.log(chalk.dim(`    • [${f.ruleId}] ${f.location.name} (${f.confidence} confidence)`));
  }
  if (safeItems.length > 10) {
    console.log(chalk.dim(`    ... and ${safeItems.length - 10} more`));
  }

  if (!isDryRun && !options.force) {
    console.log('');
    const confirmed = await clack.confirm({
      message: `A backup will be created in ${options.backupDir}. Proceed with cleaning?`,
    });

    if (!confirmed || clack.isCancel(confirmed)) {
      console.log(chalk.dim('  Cancelled.'));
      return;
    }
  }

  // ─── Clean ───────────────────────────────────────────────────────────────────
  const cleanResult = cleanBubbleApp(result, {
    inputFile: options.file,
    outputFile: options.output,
    backupDir: options.backupDir,
    dryRun: isDryRun,
    minConfidence: minConf,
    only,
  });

  if (isDryRun) {
    console.log(chalk.yellow('\n  [DRY-RUN] Would remove:'));
    for (const item of cleanResult.removedItems) {
      console.log(chalk.dim(`    ✓ [${item.ruleId}] ${item.name}`));
    }
    console.log(chalk.dim(`\n  Run without --dry-run to apply these changes.`));
  } else {
    if (cleanResult.backupPath) {
      console.log(chalk.dim(`  💾 Backup saved: ${cleanResult.backupPath}`));
    }
    console.log(
      chalk.green(
        `  ✅ Cleaned ${cleanResult.itemsRemoved} items → ${cleanResult.outputPath}`,
      ),
    );
    if (cleanResult.itemsSkipped > 0) {
      console.log(
        chalk.dim(`  ↷ ${cleanResult.itemsSkipped} items skipped (confidence too low or not safe)`),
      );
    }
  }
}

function confidenceOrder(c: string): number {
  return { HIGH: 0, MEDIUM: 1, LOW: 2 }[c] ?? 99;
}
