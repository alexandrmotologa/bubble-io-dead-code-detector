/**
 * Rule: Dead Database Field Detection
 * Finds data type fields that have no incoming references.
 * Dynamically-accessed fields (on searched types) get MEDIUM confidence.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';
import { isIgnored } from './rule.interface.js';
import type { ParsedBubbleApp, ParsedElement } from '../../parser/schema.js';

const BUILT_IN_FIELD_PATTERNS = [
  '_id', 'Created Date', 'Modified Date', 'Created By', 'slug', '_creator', '_p_deleted',
];

export const deadFieldRule: BubbleRule = {
  id: 'dead-field',
  name: 'Unused Database Field',
  description: 'Detects data type fields that are not referenced anywhere in the app.',
  category: 'dead-code',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ app, graph, config, ignore }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    // Build set of data type slugs that appear in Search expressions anywhere
    // These types may have fields accessed dynamically → downgrade confidence
    const searchedTypesSlugs = buildSearchedTypesSet(app);

    for (const dt of app.dataTypes) {
      const typeIsSearched = searchedTypesSlugs.has(dt.id);

      for (const field of dt.fields) {
        if (isBuiltInField(field.name)) continue;

        // Apply ignore filter — support "dataType.fieldName" format
        const qualifiedName = `${dt.id}.${field.id}`;
        if (isIgnored(field.id, qualifiedName, [ignore.fields])) continue;

        const fieldNodeId = `field_${dt.id}_${field.id}`;
        const node = graph.getNode(fieldNodeId);
        if (!node) continue;

        const incomingCount = graph.getIncomingCount(fieldNodeId);

        if (incomingCount === 0) {
          // Confidence downgrade cascade:
          // 1. Relational fields → MEDIUM (dynamic access common)
          // 2. Field on a searched type → MEDIUM (may be accessed dynamically in conditions)
          // 3. Otherwise → HIGH
          let confidence: Finding['confidence'] = 'HIGH';
          let dynamicNote = '';

          if (field.isRelational) {
            confidence = 'MEDIUM';
            dynamicNote = ' Note: relational fields may be referenced dynamically.';
          } else if (typeIsSearched) {
            confidence = 'MEDIUM';
            dynamicNote = ' Note: this data type appears in Search expressions — fields may be accessed dynamically in conditions.';
          }

          findings.push({
            ruleId: this.id,
            ruleName: this.name,
            severity: severity as Finding['severity'],
            confidence,
            category: this.category,
            message: `Field "${field.name}" on data type "${dt.name}" appears to be unused`,
            location: { type: 'field', id: fieldNodeId, name: field.name, parentId: `dt_${dt.id}`, parentName: dt.name },
            safeToDelete: confidence === 'HIGH',
            impactedBy: graph.getIncomingNodes(fieldNodeId).map((n) => n.id),
            suggestion: `Verify in the Bubble editor that this field is not used.${dynamicNote} If confirmed unused, delete it to reduce database bloat.`,
            metadata: {
              fieldSlug: field.id,
              fieldType: field.type,
              dataTypeSlug: dt.id,
              dataTypeName: dt.name,
              isRelational: field.isRelational,
              relatedTypeId: field.relatedTypeId,
              typeIsSearched,
            },
          });
        }
      }
    }

    return findings;
  },
};

/**
 * Collects all data type slugs that appear in Search-type expressions.
 * If a type appears in a Search, its fields may be accessed dynamically.
 */
function buildSearchedTypesSet(app: ParsedBubbleApp): Set<string> {
  const searched = new Set<string>();

  const allWorkflows = [
    ...app.pages.flatMap((p) => p.workflows),
    ...app.reusableElements.flatMap((re) => re.workflows),
    ...app.apiWorkflows,
  ];

  for (const wf of allWorkflows) {
    // Each workflow has a single referencedDataTypeSlug (the primary type it operates on)
    if (wf.referencedDataTypeSlug) searched.add(wf.referencedDataTypeSlug);
  }

  // Also check elements
  for (const page of app.pages) {
    for (const el of flattenElements(page.elements)) {
      if (el.referencedDataTypeSlug) searched.add(el.referencedDataTypeSlug);
    }
  }

  return searched;
}

function flattenElements(elements: ParsedElement[]): ParsedElement[] {
  const result: ParsedElement[] = [];
  const queue = [...elements];
  while (queue.length > 0) {
    const el = queue.shift()!;
    result.push(el);
    if (el.children) queue.push(...el.children);
  }
  return result;
}

function isBuiltInField(name: string): boolean {
  return BUILT_IN_FIELD_PATTERNS.some((p) => name.toLowerCase().includes(p.toLowerCase()));
}
