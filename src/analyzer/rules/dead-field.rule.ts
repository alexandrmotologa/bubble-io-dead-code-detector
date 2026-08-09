/**
 * Rule: Dead Database Field Detection
 * Finds data type fields that have no incoming references from
 * any element, workflow, or API workflow in the app.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

/** Built-in Bubble fields that always exist and cannot be removed */
const BUILT_IN_FIELD_PATTERNS = [
  '_id', 'Created Date', 'Modified Date', 'Created By',
  'slug', '_creator', '_p_deleted',
];

export const deadFieldRule: BubbleRule = {
  id: 'dead-field',
  name: 'Unused Database Field',
  description:
    'Detects data type fields that are not referenced anywhere in the app (elements, workflows, or API workflows).',
  category: 'dead-code',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ app, graph, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    for (const dt of app.dataTypes) {
      for (const field of dt.fields) {
        // Skip built-in fields
        if (isBuiltInField(field.name)) continue;

        const fieldNodeId = `field_${dt.id}_${field.id}`;
        const node = graph.getNode(fieldNodeId);
        if (!node) continue;

        const incomingCount = graph.getIncomingCount(fieldNodeId);

        if (incomingCount === 0) {
          // Relational fields that point to other types have lower confidence
          // since they may be referenced dynamically
          const confidence: Finding['confidence'] = field.isRelational
            ? 'MEDIUM'
            : 'HIGH';

          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: severity as Finding['severity'],
            confidence,
            category: this.category,
            message: `Field "${field.name}" on data type "${dt.name}" appears to be unused`,
            location: {
              type: 'field',
              id: fieldNodeId,
              name: field.name,
              parentId: `dt_${dt.id}`,
              parentName: dt.name,
            },
            safeToDelete: confidence === 'HIGH',
            impactedBy: graph.getIncomingNodes(fieldNodeId).map((n) => n.id),
            suggestion: `Verify in the Bubble editor that this field is not used in any expression, condition, or workflow. If confirmed unused, delete it to reduce database bloat.`,
            metadata: {
              fieldSlug: field.id,
              fieldType: field.type,
              dataTypeSlug: dt.id,
              dataTypeName: dt.name,
              isRelational: field.isRelational,
              relatedTypeId: field.relatedTypeId,
            },
          });
        }
      }
    }

    return findings;
  },
};

function isBuiltInField(name: string): boolean {
  return BUILT_IN_FIELD_PATTERNS.some(
    (p) => name.toLowerCase().includes(p.toLowerCase()),
  );
}
