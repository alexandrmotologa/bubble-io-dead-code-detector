/**
 * Interactive TUI — triggered when no arguments are provided
 */

import * as clack from '@clack/prompts';
import picocolors from 'picocolors';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function runInteractiveTui(): Promise<void> {
  console.clear();

  clack.intro(
    picocolors.bgMagenta(
      picocolors.white(picocolors.bold('  🫧 Bubble.io Dead Code Detector  ')),
    ),
  );

  // Step 1: Select file
  const filePath = await clack.text({
    message: 'Path to your .bubble export file:',
    placeholder: './app-export.bubble',
    validate(value) {
      if (!value.trim()) return 'Please provide a file path';
      if (!existsSync(resolve(value))) return `File not found: ${value}`;
    },
  });
  if (clack.isCancel(filePath)) { clack.cancel('Cancelled.'); process.exit(0); }

  // Step 2: Select action
  const action = await clack.select({
    message: 'What would you like to do?',
    options: [
      { value: 'scan', label: '🔍 Run Full App Audit', hint: 'Detect all dead code and issues' },
      { value: 'scan-html', label: '📊 Audit + Generate HTML Graph', hint: 'Interactive visual dependency map' },
      { value: 'scan-all', label: '🚀 Audit + All Report Formats', hint: 'JSON + HTML + Markdown + SARIF' },
      { value: 'scan-security', label: '🔐 Security Audit Only', hint: 'Check for privacy rules and exposed APIs' },
      { value: 'clean-dry', label: '🧹 Preview Clean (Dry Run)', hint: 'See what would be removed' },
      { value: 'clean', label: '✂️  Clean Dead Code (with backup)', hint: 'Safely remove verified dead items' },
    ],
  });
  if (clack.isCancel(action)) { clack.cancel('Cancelled.'); process.exit(0); }

  // Step 3: Output dir
  const outputDir = await clack.text({
    message: 'Output directory for reports:',
    placeholder: './audit-results',
    initialValue: './audit-results',
  });
  if (clack.isCancel(outputDir)) { clack.cancel('Cancelled.'); process.exit(0); }

  const fileStr = String(filePath);
  const actionStr = String(action);
  const outputDirStr = String(outputDir);

  clack.outro(
    picocolors.green(`Running: bubble-detector ${actionStr} --file ${fileStr}`) +
      '\n\n' +
      picocolors.dim('Tip: Save time by using CLI flags directly next time!'),
  );

  await executeAction(fileStr, actionStr, outputDirStr);
}

async function executeAction(filePath: string, action: string, outputDir: string): Promise<void> {
  const { readBubbleFile, parseBubbleApp } = await import('../parser/index.js');
  const { analyzeApp } = await import('../analyzer/index.js');
  const { printConsoleReport } = await import('../reporters/console-reporter.js');
  const { writeJsonReport } = await import('../reporters/json-reporter.js');
  const { writeHtmlReport } = await import('../reporters/html-reporter.js');
  const { writeMarkdownReport } = await import('../reporters/markdown-reporter.js');
  const { writeSarifReport } = await import('../reporters/sarif-reporter.js');
  const ora = (await import('ora')).default;

  const spinner = ora('Parsing and analyzing...').start();

  try {
    const rawApp = readBubbleFile(filePath);
    const parsedApp = parseBubbleApp(rawApp);
    const only = action === 'scan-security' ? ['security'] : undefined;
    const result = analyzeApp(parsedApp, { only });

    spinner.succeed('Analysis complete!');
    printConsoleReport(result);

    const dir = resolve(outputDir);

    if (['scan-html', 'scan-all'].includes(action)) {
      const p = writeHtmlReport(result, dir);
      console.log('\n  🌐 HTML report: ' + p);
    }
    if (action === 'scan-all') {
      writeJsonReport(result, dir);
      writeMarkdownReport(result, dir);
      writeSarifReport(result, dir);
      console.log('  📁 All reports saved to: ' + dir);
    }
  } catch (err) {
    spinner.fail((err as Error).message);
    process.exit(1);
  }
}
