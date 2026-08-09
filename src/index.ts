#!/usr/bin/env node
/**
 * bubble-io-dead-code-detector — Entry point
 * Alias: bubble-detector
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { registerScanCommand } from './cli/commands/scan.js';
import { registerCleanCommand } from './cli/commands/clean.js';
import { registerWatchCommand } from './cli/commands/watch.js';
import { registerDiffCommand } from './cli/commands/diff.js';
import { runInteractiveTui } from './cli/interactive.js';

// Read package.json version
const __dirname = dirname(fileURLToPath(import.meta.url));
let version = '1.0.0';
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
  );
  version = pkg.version ?? '1.0.0';
} catch {
  // fallback to default
}

const program = new Command();

program
  .name('bubble-io-dead-code-detector')
  .description(
    '🫧 Dead code detector, dependency analyzer & health scorer for Bubble.io applications',
  )
  .version(version, '-v, --version', 'Show version')
  .addHelpText(
    'after',
    `
Examples:
  $ bubble-detector scan --file ./app.bubble
  $ bubble-detector scan --file ./app.bubble --html --json --csv --output-dir ./audit
  $ bubble-detector scan --file ./app.bubble --fail-below 70
  $ bubble-detector clean --file ./app.bubble --dry-run
  $ bubble-detector clean --file ./app.bubble --only dead-plugin,dead-option-set
  $ bubble-detector watch --file ./app.bubble --html
  $ bubble-detector diff --before ./v1.bubble --after ./v2.bubble

Run without arguments to launch the interactive TUI:
  $ bubble-detector
    `,
  );

// Register commands
registerScanCommand(program);
registerCleanCommand(program);
registerWatchCommand(program);
registerDiffCommand(program);

// Add validate command (lightweight)
program
  .command('validate')
  .description('Validate that a file is a valid Bubble.io export')
  .argument('<file>', 'Path to .bubble file')
  .action(async (file: string) => {
    const { readBubbleFile } = await import('./parser/index.js');
    try {
      const app = readBubbleFile(file);
      console.log(`✅ Valid Bubble app export`);
      console.log(`   App ID:  ${app._id}`);
      console.log(`   Version: ${app.app_version}`);
      console.log(`   Pages:   ${Object.keys(app.pages).length}`);
      console.log(`   Types:   ${Object.keys(app.user_types).length}`);
    } catch (err) {
      console.error(`✖ Invalid: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// Add init command
program
  .command('init')
  .description('Generate a .bubblerc.json configuration file in the current directory')
  .action(async () => {
    const { writeFileSync, existsSync } = await import('fs');
    const configPath = '.bubblerc.json';
    if (existsSync(configPath)) {
      console.log('⚠ .bubblerc.json already exists. Delete it first to reinitialize.');
      return;
    }
    const defaultConfig = {
      $schema: 'https://unpkg.com/bubble-io-dead-code-detector@latest/schemas/bubblerc.json',
      ignore: { workflows: [], fields: [], pages: [], plugins: [], optionSets: [], styles: [] },
      rules: {
        'dead-workflow': { enabled: true, severity: 'error' },
        'dead-field': { enabled: true, severity: 'warning' },
        'dead-plugin': { enabled: true, severity: 'error' },
        'dead-style': { enabled: true, severity: 'info' },
        'dead-option-set': { enabled: true, severity: 'warning' },
        complexity: { enabled: true, maxWorkflowActions: 15, maxPageElements: 200 },
        security: { enabled: true, checkPrivacyRules: true, checkExposedEndpoints: true },
      },
      healthScore: { failBelow: 70 },
      output: { dir: './audit-results', formats: ['json', 'html'] },
      clean: { backupDir: './backups', minConfidence: 'HIGH', requireConfirmation: true },
    };
    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Created .bubblerc.json — customize rules and thresholds as needed.');
  });

// If no arguments → launch interactive TUI
if (process.argv.length <= 2) {
  runInteractiveTui().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  program.parse(process.argv);
}
