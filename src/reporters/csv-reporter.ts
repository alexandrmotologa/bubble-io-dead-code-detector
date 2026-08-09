/**
 * CSV Reporter — exports findings as CSV for Excel / Google Sheets
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AnalysisResult } from '../analyzer/index.js';

const CSV_HEADERS = [
  'rule_id',
  'rule_name',
  'severity',
  'confidence',
  'category',
  'location_type',
  'name',
  'parent',
  'safe_to_delete',
  'message',
  'suggestion',
].join(',');

export function writeCsvReport(result: AnalysisResult, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });

  const rows = result.findings.map((f) => {
    return [
      f.ruleId,
      f.ruleName,
      f.severity,
      f.confidence,
      f.category,
      f.location.type,
      csvEscape(f.location.name),
      csvEscape(f.location.parentName ?? ''),
      f.safeToDelete ? 'YES' : 'NO',
      csvEscape(f.message),
      csvEscape(f.suggestion),
    ].join(',');
  });

  // Add summary rows at the top
  const summary = [
    `# bubble-io-dead-code-detector — Audit Report`,
    `# App: ${result.app.meta.id}`,
    `# Health Score: ${result.healthScore.score}/100 (${result.healthScore.grade})`,
    `# Total Issues: ${result.findings.length} (${result.findings.filter(f => f.severity === 'error').length} errors / ${result.findings.filter(f => f.severity === 'warning').length} warnings / ${result.findings.filter(f => f.severity === 'info').length} info)`,
    `# Generated: ${result.timestamp.toISOString()}`,
    '',
    CSV_HEADERS,
    ...rows,
  ];

  const outputPath = join(outputDir, 'audit-report.csv');
  writeFileSync(outputPath, summary.join('\n'), 'utf-8');
  return outputPath;
}

/** Wraps a value in double-quotes and escapes internal double-quotes */
function csvEscape(value: string): string {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}
