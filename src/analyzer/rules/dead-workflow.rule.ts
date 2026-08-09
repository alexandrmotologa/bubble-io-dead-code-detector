/**
 * Rule: Dead Workflow Detection
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';
import { isIgnored } from './rule.interface.js';

const ALWAYS_ALIVE_TRIGGERS = new Set([
  'PageLoaded', 'LoggedIn', 'LoggedOut', 'APIEvent',
  'DatabaseTriggerEvent', 'RecurringEvent', 'ConditionTrue', 'DoInterval',
]);

export const deadWorkflowRule: BubbleRule = {
  id: 'dead-workflow',
  name: 'Dead Workflow',
  description: 'Detects workflows that are never triggered — no UI element references them and they have no system trigger.',
  category: 'dead-code',
  defaultSeverity: 'error',
  defaultEnabled: true,

  check({ app, graph, config, ignore }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    const allWorkflows = [
      ...app.pages.flatMap((p) => p.workflows.map((wf) => ({ wf, parentName: p.name }))),
      ...app.reusableElements.flatMap((re) => re.workflows.map((wf) => ({ wf, parentName: re.name }))),
    ];

    for (const { wf, parentName } of allWorkflows) {
      if (ALWAYS_ALIVE_TRIGGERS.has(wf.triggerType)) continue;
      if (!isKnownClientTrigger(wf.triggerType) && wf.triggerType !== 'CustomEvent') continue;

      // Apply ignore filter
      if (isIgnored(wf.id, wf.name, [ignore.workflows])) continue;

      const node = graph.getNode(wf.id);
      if (!node) continue;

      const incomingCount = graph.getIncomingCount(wf.id);

      if (incomingCount === 0) {
        let confidence: Finding['confidence'] = 'HIGH';
        let message = `Workflow "${wf.name}" on "${parentName}" is never triggered`;

        if (wf.triggerType === 'ButtonClicked' && !wf.triggerElementId) {
          confidence = 'MEDIUM';
          message = `Workflow "${wf.name}" on "${parentName}" references a missing button element`;
        } else if (wf.isCustomEvent) {
          confidence = 'MEDIUM';
          message = `Custom event "${wf.name}" on "${parentName}" is never called`;
        }

        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence,
          category: this.category,
          message,
          location: { type: 'workflow', id: wf.id, name: wf.name, parentId: wf.parentId, parentName },
          safeToDelete: confidence === 'HIGH' && wf.actionCount === 0,
          impactedBy: [],
          suggestion: `Review and remove if this workflow is no longer needed. It has ${wf.actionCount} action(s).`,
          metadata: { triggerType: wf.triggerType, actionCount: wf.actionCount, triggerElementId: wf.triggerElementId },
        });
      }
    }

    return findings;
  },
};

function isKnownClientTrigger(type: string): boolean {
  return ['ButtonClicked', 'InputChanged', 'CustomEvent', 'ConditionTrue', 'DoInterval', 'OnPageError'].includes(type);
}
