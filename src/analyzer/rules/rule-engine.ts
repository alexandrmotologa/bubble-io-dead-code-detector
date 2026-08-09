/**
 * Rule Engine — loads and runs all rules against the app.
 */

import type { BubbleRule, Finding, RuleContext, RuleConfig } from './rule.interface.js';
import { deadWorkflowRule } from './dead-workflow.rule.js';
import { deadFieldRule } from './dead-field.rule.js';
import { deadPluginRule } from './dead-plugin.rule.js';
import { deadStyleRule, deadOptionSetRule } from './dead-style.rule.js';
import { complexityRule } from './complexity.rule.js';
import { securityRule } from './security.rule.js';

/** All built-in rules, ordered by priority */
export const ALL_RULES: BubbleRule[] = [
  securityRule,
  deadWorkflowRule,
  deadFieldRule,
  deadPluginRule,
  deadStyleRule,
  deadOptionSetRule,
  complexityRule,
];

export type RulesConfig = Partial<Record<string, RuleConfig>>;

export interface RuleEngineResult {
  findings: Finding[];
  rulesRun: number;
  rulesTiming: Record<string, number>;
}

/**
 * Runs all enabled rules and returns aggregated findings.
 */
export function runRules(
  context: Omit<RuleContext, 'config'>,
  rulesConfig: RulesConfig = {},
  only?: string[],
): RuleEngineResult {
  const findings: Finding[] = [];
  const rulesTiming: Record<string, number> = {};
  let rulesRun = 0;

  for (const rule of ALL_RULES) {
    // Filter by --only flag
    if (only && only.length > 0 && !only.includes(rule.id)) continue;

    const config = buildRuleConfig(rule, rulesConfig[rule.id]);

    // Skip disabled rules
    if (!config.enabled) continue;

    const start = Date.now();
    try {
      const ruleFindings = rule.check({ ...context, config });
      findings.push(...ruleFindings);
    } catch (err) {
      // Never let a single rule crash the entire analysis
      console.error(`Rule "${rule.id}" threw an error:`, err);
    }
    rulesTiming[rule.id] = Date.now() - start;
    rulesRun++;
  }

  // Sort: errors first, then warnings, then info; within each group by confidence
  findings.sort((a, b) => {
    const sevOrder = { error: 0, warning: 1, info: 2 };
    const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return confOrder[a.confidence] - confOrder[b.confidence];
  });

  return { findings, rulesRun, rulesTiming };
}

function buildRuleConfig(rule: BubbleRule, userConfig?: Partial<RuleConfig>): RuleConfig {
  return {
    enabled: userConfig?.enabled ?? rule.defaultEnabled,
    severity: userConfig?.severity ?? rule.defaultSeverity,
    ...userConfig,
  };
}

/** Returns rule metadata for display */
export function getRuleInfo(): Array<{
  id: string;
  name: string;
  category: string;
  defaultSeverity: string;
  description: string;
}> {
  return ALL_RULES.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    defaultSeverity: r.defaultSeverity,
    description: r.description,
  }));
}
