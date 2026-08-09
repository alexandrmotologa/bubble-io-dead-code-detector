/**
 * App Health Score calculator.
 * Produces a 0-100 score based on dead code density and complexity violations.
 */

import type { Finding } from './rules/rule.interface.js';
import type { ParsedBubbleApp } from '../parser/schema.js';

export interface HealthScoreWeights {
  deadWorkflows: number;
  deadFields: number;
  deadPlugins: number;
  deadStyles: number;
  deadOptionSets: number;
  complexity: number;
  security: number;
}

const DEFAULT_WEIGHTS: HealthScoreWeights = {
  deadWorkflows: 25,
  deadFields: 20,
  deadPlugins: 20,
  deadStyles: 10,
  deadOptionSets: 5,
  complexity: 10,
  security: 10,
};

export interface HealthScore {
  score: number;
  grade: HealthGrade;
  label: string;
  emoji: string;
  breakdown: HealthBreakdown;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export type HealthGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface HealthBreakdown {
  deadWorkflows: { count: number; total: number; penalty: number };
  deadFields: { count: number; total: number; penalty: number };
  deadPlugins: { count: number; total: number; penalty: number };
  deadStyles: { count: number; total: number; penalty: number };
  deadOptionSets: { count: number; total: number; penalty: number };
  complexityViolations: { count: number; penalty: number };
  securityIssues: { count: number; penalty: number };
}

export function calculateHealthScore(
  findings: Finding[],
  app: ParsedBubbleApp,
  weights: Partial<HealthScoreWeights> = {},
): HealthScore {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Totals
  const totalWorkflows =
    app.pages.reduce((s, p) => s + p.workflows.length, 0) +
    app.reusableElements.reduce((s, re) => s + re.workflows.length, 0);
  const totalFields = app.dataTypes.reduce(
    (s, dt) => s + dt.fields.length,
    0,
  );
  const totalPlugins = app.plugins.filter((p) => p.isActive).length;
  const totalStyles = app.styles.length;
  const totalOptionSets = app.optionSets.length;

  // Dead counts from findings
  const deadWorkflows = countFindings(findings, 'dead-workflow');
  const deadFields = countFindings(findings, 'dead-field');
  const deadPlugins = countFindings(findings, 'dead-plugin');
  const deadStyles = countFindings(findings, 'dead-style');
  const deadOptionSets = countFindings(findings, 'dead-option-set');
  const complexityViolations = countFindings(findings, 'complexity');
  const securityIssues = countFindings(findings, 'security');

  // Calculate penalties (0-weight points each)
  const workflowPenalty = ratio(deadWorkflows, totalWorkflows) * w.deadWorkflows;
  const fieldPenalty = ratio(deadFields, totalFields) * w.deadFields;
  const pluginPenalty = ratio(deadPlugins, totalPlugins) * w.deadPlugins;
  const stylePenalty = ratio(deadStyles, totalStyles) * w.deadStyles;
  const optionSetPenalty = ratio(deadOptionSets, totalOptionSets) * w.deadOptionSets;
  const complexityPenalty = Math.min(complexityViolations * 3, w.complexity);
  const securityPenalty = Math.min(securityIssues * 5, w.security);

  const totalPenalty =
    workflowPenalty +
    fieldPenalty +
    pluginPenalty +
    stylePenalty +
    optionSetPenalty +
    complexityPenalty +
    securityPenalty;

  const score = Math.max(0, Math.round(100 - totalPenalty));

  return {
    score,
    grade: getGrade(score),
    label: getLabel(score),
    emoji: getEmoji(score),
    breakdown: {
      deadWorkflows: { count: deadWorkflows, total: totalWorkflows, penalty: Math.round(workflowPenalty) },
      deadFields: { count: deadFields, total: totalFields, penalty: Math.round(fieldPenalty) },
      deadPlugins: { count: deadPlugins, total: totalPlugins, penalty: Math.round(pluginPenalty) },
      deadStyles: { count: deadStyles, total: totalStyles, penalty: Math.round(stylePenalty) },
      deadOptionSets: { count: deadOptionSets, total: totalOptionSets, penalty: Math.round(optionSetPenalty) },
      complexityViolations: { count: complexityViolations, penalty: Math.round(complexityPenalty) },
      securityIssues: { count: securityIssues, penalty: Math.round(securityPenalty) },
    },
    totalFindings: findings.length,
    errorCount: findings.filter((f) => f.severity === 'error').length,
    warningCount: findings.filter((f) => f.severity === 'warning').length,
    infoCount: findings.filter((f) => f.severity === 'info').length,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countFindings(findings: Finding[], ruleId: string): number {
  return findings.filter((f) => f.ruleId === ruleId).length;
}

function ratio(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(count / total, 1);
}

function getGrade(score: number): HealthGrade {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 55) return 'fair';
  if (score >= 35) return 'poor';
  return 'critical';
}

function getLabel(score: number): string {
  if (score >= 90) return 'Excellent — Clean & Maintainable';
  if (score >= 75) return 'Good — Minor cleanup recommended';
  if (score >= 55) return 'Fair — Moderate technical debt';
  if (score >= 35) return 'Poor — Significant refactoring needed';
  return 'Critical — App is heavily bloated';
}

function getEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 75) return '🟡';
  if (score >= 55) return '🟠';
  if (score >= 35) return '🔴';
  return '⚫';
}
