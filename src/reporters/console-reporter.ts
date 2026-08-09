/**
 * Console reporter — rich, color-coded terminal output.
 */

import chalk from 'chalk';
import type { AnalysisResult } from '../analyzer/index.js';
import type { Finding } from '../analyzer/rules/rule.interface.js';

export function printConsoleReport(result: AnalysisResult): void {
  const { findings, healthScore, graphStats, app, analysisDurationMs } = result;

  console.log('\n');

  // ─── Header ─────────────────────────────────────────────────────────────────
  console.log(
    chalk.bold.hex('#7C3AED')(
      '╔══════════════════════════════════════════════════════════╗',
    ),
  );
  console.log(
    chalk.bold.hex('#7C3AED')(
      '║  🫧  Bubble.io Dead Code Detector — Audit Report         ║',
    ),
  );
  console.log(
    chalk.bold.hex('#7C3AED')(
      '╚══════════════════════════════════════════════════════════╝',
    ),
  );
  console.log('');

  // ─── App Info ────────────────────────────────────────────────────────────────
  console.log(chalk.dim(`  App ID:      ${app.meta.id}`));
  console.log(chalk.dim(`  Version:     ${app.meta.version}`));
  console.log(
    chalk.dim(
      `  Last Change: ${app.meta.lastChange.toLocaleDateString()} ${app.meta.lastChange.toLocaleTimeString()}`,
    ),
  );
  console.log(chalk.dim(`  Scanned in:  ${analysisDurationMs}ms`));
  console.log('');

  // ─── Health Score ────────────────────────────────────────────────────────────
  const scoreColor =
    healthScore.score >= 90
      ? chalk.green
      : healthScore.score >= 75
        ? chalk.yellow
        : healthScore.score >= 55
          ? chalk.hex('#FFA500')
          : chalk.red;

  console.log(
    chalk.bold('  App Health Score: ') +
      scoreColor(chalk.bold(`${healthScore.emoji} ${healthScore.score}/100`)) +
      chalk.dim(` — ${healthScore.label}`),
  );
  console.log('');

  // Score breakdown
  const bd = healthScore.breakdown;
  console.log(chalk.bold.dim('  Score Breakdown:'));

  const breakdownRows = [
    ['Dead Workflows', bd.deadWorkflows.count, bd.deadWorkflows.total, bd.deadWorkflows.penalty],
    ['Dead DB Fields', bd.deadFields.count, bd.deadFields.total, bd.deadFields.penalty],
    ['Inactive Plugins', bd.deadPlugins.count, bd.deadPlugins.total, bd.deadPlugins.penalty],
    ['Unused Styles', bd.deadStyles.count, bd.deadStyles.total, bd.deadStyles.penalty],
    ['Unused Option Sets', bd.deadOptionSets.count, bd.deadOptionSets.total, bd.deadOptionSets.penalty],
    ['Complexity Issues', bd.complexityViolations.count, null, bd.complexityViolations.penalty],
    ['Security Issues', bd.securityIssues.count, null, bd.securityIssues.penalty],
  ] as const;

  for (const [label, count, total, penalty] of breakdownRows) {
    const totalStr = total !== null ? `/${total}` : '';
    const penaltyStr = penalty > 0 ? chalk.red(` -${penalty}pts`) : chalk.green(' 0pts');
    console.log(
      `  ${chalk.dim('•')} ${label.padEnd(20)} ${
        count > 0 ? chalk.yellow(String(count)) : chalk.green('0')
      }${totalStr}${penaltyStr}`,
    );
  }
  console.log('');

  // ─── Graph Stats ─────────────────────────────────────────────────────────────
  console.log(chalk.bold.dim('  Dependency Graph:'));
  console.log(
    `  ${chalk.dim('Nodes:')} ${graphStats.totalNodes}   ${chalk.dim('Edges:')} ${graphStats.totalEdges}`,
  );
  console.log(
    `  ${chalk.dim('Pages:')} ${graphStats.byKind?.page ?? 0}  ` +
      `${chalk.dim('Elements:')} ${graphStats.byKind?.element ?? 0}  ` +
      `${chalk.dim('Workflows:')} ${(graphStats.byKind?.workflow ?? 0) + (graphStats.byKind?.api_workflow ?? 0)}  ` +
      `${chalk.dim('Data Types:')} ${graphStats.byKind?.data_type ?? 0}  ` +
      `${chalk.dim('Fields:')} ${graphStats.byKind?.field ?? 0}`,
  );
  console.log('');

  // ─── Findings ────────────────────────────────────────────────────────────────
  if (findings.length === 0) {
    console.log(chalk.green.bold('  ✅  No issues found! Your app is clean.'));
  } else {
    console.log(
      chalk.bold(
        `  Found ${chalk.yellow(String(findings.length))} issues: ` +
          chalk.red(`${healthScore.errorCount} errors`) +
          ', ' +
          chalk.yellow(`${healthScore.warningCount} warnings`) +
          ', ' +
          chalk.blue(`${healthScore.infoCount} info`),
      ),
    );
    console.log('');

    // Group findings by rule
    const byRule = groupByRule(findings);
    for (const [ruleId, ruleFindings] of Object.entries(byRule)) {
      printRuleGroup(ruleId, ruleFindings);
    }
  }

  console.log(chalk.bold.hex('#7C3AED')('  ─────────────────────────────────'));
  console.log(
    chalk.dim('  Run with --html to generate an interactive visual graph'),
  );
  console.log(
    chalk.dim('  Run with --json to export machine-readable findings'),
  );
  console.log('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function printRuleGroup(ruleId: string, findings: Finding[]): void {
  const first = findings[0];
  const severityIcon = {
    error: chalk.red('✖'),
    warning: chalk.yellow('⚠'),
    info: chalk.blue('ℹ'),
  }[first.severity];

  const severityColor = {
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
  }[first.severity];

  console.log(
    `  ${severityIcon} ${severityColor.bold(first.ruleName)} ` +
      chalk.dim(`(${findings.length} issue${findings.length !== 1 ? 's' : ''})`),
  );

  // Show up to 5 findings per rule, then summarize the rest
  const toShow = findings.slice(0, 5);
  for (const f of toShow) {
    const confidenceBadge =
      f.confidence === 'HIGH'
        ? chalk.red('[HIGH]')
        : f.confidence === 'MEDIUM'
          ? chalk.yellow('[MED]')
          : chalk.dim('[LOW]');
    console.log(`    ${confidenceBadge} ${f.message}`);
    console.log(chalk.dim(`       💡 ${f.suggestion}`));
  }

  if (findings.length > 5) {
    console.log(chalk.dim(`    ... and ${findings.length - 5} more`));
  }
  console.log('');
}

function groupByRule(findings: Finding[]): Record<string, Finding[]> {
  const result: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!result[f.ruleId]) result[f.ruleId] = [];
    result[f.ruleId].push(f);
  }
  return result;
}
