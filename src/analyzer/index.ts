/**
 * Analyzer orchestrator — ties together graph construction, rule engine, and scoring.
 */

import type { ParsedBubbleApp } from '../parser/schema.js';
import { buildDependencyGraph } from './graph/edge-resolver.js';
import { runRules, type RulesConfig } from './rules/rule-engine.js';
import { calculateHealthScore, type HealthScore, type HealthScoreWeights } from './health-scorer.js';
import type { DependencyGraph, GraphStats } from './graph/dag.js';
import type { Finding, IgnoreConfig } from './rules/rule.interface.js';

export type { Finding, HealthScore };

export interface AnalysisResult {
  app: ParsedBubbleApp;
  graph: DependencyGraph;
  graphStats: GraphStats;
  findings: Finding[];
  healthScore: HealthScore;
  rulesRun: number;
  analysisDurationMs: number;
  timestamp: Date;
}

export interface AnalysisOptions {
  rulesConfig?: RulesConfig;
  healthWeights?: Partial<HealthScoreWeights>;
  only?: string[];
  minConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Items to exclude from analysis — loaded from .bubblerc.json ignore section */
  ignore?: IgnoreConfig;
}

export function analyzeApp(
  app: ParsedBubbleApp,
  options: AnalysisOptions = {},
): AnalysisResult {
  const start = Date.now();

  // Build dependency graph
  const graph = buildDependencyGraph(app);
  const graphStats = graph.getStats();

  // Run all rules
  const ignore: IgnoreConfig = options.ignore ?? {};
  const { findings: allFindings, rulesRun } = runRules(
    { app, graph, ignore },
    options.rulesConfig,
    options.only,
  );

  // Filter by minimum confidence
  const findings = options.minConfidence
    ? filterByConfidence(allFindings, options.minConfidence)
    : allFindings;

  // Calculate health score
  const healthScore = calculateHealthScore(findings, app, options.healthWeights);

  return {
    app,
    graph,
    graphStats,
    findings,
    healthScore,
    rulesRun,
    analysisDurationMs: Date.now() - start,
    timestamp: new Date(),
  };
}

function filterByConfidence(
  findings: Finding[],
  minConfidence: 'HIGH' | 'MEDIUM' | 'LOW',
): Finding[] {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const minOrder = order[minConfidence];
  return findings.filter((f) => order[f.confidence] <= minOrder);
}
