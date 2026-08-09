/**
 * Rule: Complexity Analysis
 * Flags pages and workflows that exceed complexity thresholds.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';
import { flattenElements } from '../graph/edge-resolver.js';

const DEFAULT_MAX_WORKFLOW_ACTIONS = 15;
const DEFAULT_MAX_PAGE_ELEMENTS = 200;
const DEFAULT_MAX_NESTING_DEPTH = 8;

export const complexityRule: BubbleRule = {
  id: 'complexity',
  name: 'High Complexity',
  description:
    'Flags workflows with too many actions, pages with too many elements, or deeply nested element trees.',
  category: 'complexity',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ app, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;
    const maxActions = (config['maxWorkflowActions'] as number) ?? DEFAULT_MAX_WORKFLOW_ACTIONS;
    const maxElements = (config['maxPageElements'] as number) ?? DEFAULT_MAX_PAGE_ELEMENTS;
    const maxDepth = (config['maxNestingDepth'] as number) ?? DEFAULT_MAX_NESTING_DEPTH;

    // Check workflows
    const allWorkflows = [
      ...app.pages.flatMap((p) =>
        p.workflows.map((wf) => ({ wf, parentName: p.name, parentId: p.id })),
      ),
      ...app.reusableElements.flatMap((re) =>
        re.workflows.map((wf) => ({ wf, parentName: re.name, parentId: re.id })),
      ),
    ];

    for (const { wf, parentName, parentId } of allWorkflows) {
      if (wf.actionCount > maxActions) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'HIGH',
          category: this.category,
          message: `Workflow "${wf.name}" on "${parentName}" has ${wf.actionCount} actions (max: ${maxActions})`,
          location: {
            type: 'workflow',
            id: wf.id,
            name: wf.name,
            parentId,
            parentName,
          },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Consider splitting this workflow into multiple smaller workflows or using custom events to modularize the logic.`,
          metadata: { actionCount: wf.actionCount, threshold: maxActions },
        });
      }
    }

    // Check page element counts
    for (const page of app.pages) {
      const allElements = flattenElements(page.elements);
      if (allElements.length > maxElements) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'HIGH',
          category: this.category,
          message: `Page "${page.name}" has ${allElements.length} elements (max: ${maxElements})`,
          location: {
            type: 'page',
            id: page.id,
            name: page.name,
          },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Consider moving sections to reusable elements or breaking this page into sub-pages to improve performance and maintainability.`,
          metadata: { elementCount: allElements.length, threshold: maxElements },
        });
      }

      // Check nesting depth
      const maxNestingFound = getMaxNestingDepth(page.elements, 0);
      if (maxNestingFound > maxDepth) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: 'info' as Finding['severity'],
          confidence: 'HIGH',
          category: this.category,
          message: `Page "${page.name}" has element nesting depth of ${maxNestingFound} (max: ${maxDepth})`,
          location: {
            type: 'page',
            id: page.id,
            name: page.name,
          },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Deeply nested elements can slow down the Bubble editor and runtime. Consider flattening the UI structure.`,
          metadata: { nestingDepth: maxNestingFound, threshold: maxDepth },
        });
      }
    }

    return findings;
  },
};

function getMaxNestingDepth(
  elements: import('../../parser/schema.js').ParsedElement[],
  currentDepth: number,
): number {
  if (elements.length === 0) return currentDepth;
  let max = currentDepth;
  for (const el of elements) {
    const childDepth = getMaxNestingDepth(el.children, currentDepth + 1);
    if (childDepth > max) max = childDepth;
  }
  return max;
}
