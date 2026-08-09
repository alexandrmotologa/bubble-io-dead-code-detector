/**
 * JSON reporter — writes machine-readable audit-report.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AnalysisResult } from '../analyzer/index.js';

export interface JsonReport {
  meta: {
    appId: string;
    appVersion: string;
    generatedAt: string;
    analysisDurationMs: number;
    detectorVersion: string;
  };
  healthScore: {
    score: number;
    grade: string;
    label: string;
  };
  summary: {
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    byRule: Record<string, number>;
  };
  graphStats: {
    totalNodes: number;
    totalEdges: number;
  };
  findings: Array<{
    ruleId: string;
    ruleName: string;
    severity: string;
    confidence: string;
    category: string;
    message: string;
    location: unknown;
    safeToDelete: boolean;
    suggestion: string;
    metadata: unknown;
  }>;
}

export function writeJsonReport(
  result: AnalysisResult,
  outputDir: string,
): string {
  mkdirSync(outputDir, { recursive: true });

  const report: JsonReport = {
    meta: {
      appId: result.app.meta.id,
      appVersion: result.app.meta.version,
      generatedAt: result.timestamp.toISOString(),
      analysisDurationMs: result.analysisDurationMs,
      detectorVersion: '1.0.0',
    },
    healthScore: {
      score: result.healthScore.score,
      grade: result.healthScore.grade,
      label: result.healthScore.label,
    },
    summary: {
      totalFindings: result.findings.length,
      errors: result.healthScore.errorCount,
      warnings: result.healthScore.warningCount,
      info: result.healthScore.infoCount,
      byRule: buildRuleSummary(result),
    },
    graphStats: {
      totalNodes: result.graphStats.totalNodes,
      totalEdges: result.graphStats.totalEdges,
    },
    findings: result.findings.map((f) => ({
      ruleId: f.ruleId,
      ruleName: f.ruleName,
      severity: f.severity,
      confidence: f.confidence,
      category: f.category,
      message: f.message,
      location: f.location,
      safeToDelete: f.safeToDelete,
      suggestion: f.suggestion,
      metadata: f.metadata,
    })),
  };

  const outputPath = join(outputDir, 'audit-report.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  return outputPath;
}

function buildRuleSummary(result: AnalysisResult): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const f of result.findings) {
    summary[f.ruleId] = (summary[f.ruleId] ?? 0) + 1;
  }
  return summary;
}
