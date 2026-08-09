/**
 * Rule interface — all rules implement this contract.
 */

import type { ParsedBubbleApp } from '../../parser/schema.js';
import type { DependencyGraph } from '../graph/dag.js';

export type Severity = 'error' | 'warning' | 'info';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type Category = 'dead-code' | 'complexity' | 'security' | 'naming' | 'quality';

export interface Finding {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  confidence: Confidence;
  category: Category;
  message: string;
  location: FindingLocation;
  safeToDelete: boolean;
  /** IDs of other nodes that would be impacted if this item is deleted */
  impactedBy: string[];
  suggestion: string;
  metadata: Record<string, unknown>;
}

export interface FindingLocation {
  type: 'page' | 'element' | 'workflow' | 'field' | 'data_type' | 'option_set' | 'style' | 'plugin' | 'reusable_element' | 'api_workflow';
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
}

export interface RuleConfig {
  enabled: boolean;
  severity?: Severity;
  [key: string]: unknown;
}

export interface IgnoreConfig {
  workflows?: string[];
  fields?: string[];
  pages?: string[];
  plugins?: string[];
  optionSets?: string[];
  styles?: string[];
}

export interface RuleContext {
  app: ParsedBubbleApp;
  graph: DependencyGraph;
  config: RuleConfig;
  /** Items explicitly ignored via .bubblerc.json ignore lists */
  ignore: IgnoreConfig;
}

export interface BubbleRule {
  id: string;
  name: string;
  description: string;
  category: Category;
  defaultSeverity: Severity;
  defaultEnabled: boolean;

  check(context: RuleContext): Finding[];
}

/**
 * Returns true if the given id or name appears in any of the provided ignore lists.
 * Rules call this before pushing a Finding.
 */
export function isIgnored(
  id: string,
  name: string,
  lists: Array<string[] | undefined>,
): boolean {
  const lowerName = name.toLowerCase();
  const lowerId = id.toLowerCase();
  for (const list of lists) {
    if (!list) continue;
    for (const entry of list) {
      const lower = entry.toLowerCase();
      if (lowerId === lower || lowerName === lower || lowerName.includes(lower)) {
        return true;
      }
    }
  }
  return false;
}
