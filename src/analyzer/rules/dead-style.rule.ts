/**
 * Rule: Dead Style Detection
 * Finds styles that are not referenced by any element.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

export const deadStyleRule: BubbleRule = {
  id: 'dead-style',
  name: 'Unused Style',
  description:
    'Detects styles defined in the app that are not applied to any element.',
  category: 'dead-code',
  defaultSeverity: 'info',
  defaultEnabled: true,

  check({ graph, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    const styleNodes = graph.getNodesByKind('style');

    for (const node of styleNodes) {
      const incomingCount = graph.getIncomingCount(node.id);

      if (incomingCount === 0) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'MEDIUM',
          category: this.category,
          message: `Style "${node.name}" is not applied to any element`,
          location: {
            type: 'style',
            id: node.id,
            name: node.name,
          },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Remove this style from the Styles panel if no elements use it. Note: Bubble may not always expose all style references in the export.`,
          metadata: {
            styleId: node.id,
            elementType: node.metadata['elementType'],
          },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Dead Option Set Detection
 */
export const deadOptionSetRule: BubbleRule = {
  id: 'dead-option-set',
  name: 'Unused Option Set',
  description:
    'Detects option sets that are not referenced by any element or workflow.',
  category: 'dead-code',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ graph, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    const osNodes = graph.getNodesByKind('option_set');

    for (const node of osNodes) {
      const incomingCount = graph.getIncomingCount(node.id);

      if (incomingCount === 0) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'MEDIUM',
          category: this.category,
          message: `Option Set "${node.name}" appears to be unused`,
          location: {
            type: 'option_set',
            id: node.id,
            name: node.name,
          },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Verify in the Bubble editor that this option set is not used in any dropdown, condition, or workflow. If confirmed, delete it.`,
          metadata: {
            optionSetId: node.id,
            optionCount: node.metadata['optionCount'],
          },
        });
      }
    }

    return findings;
  },
};
