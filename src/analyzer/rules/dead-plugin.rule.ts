/**
 * Rule: Dead Plugin Detection
 * Finds installed plugins that have no elements using their components
 * and no workflows using their actions.
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

export const deadPluginRule: BubbleRule = {
  id: 'dead-plugin',
  name: 'Inactive Plugin',
  description:
    'Detects installed plugins that have no elements or workflows referencing them. Unused plugins slow down page load and increase app complexity.',
  category: 'dead-code',
  defaultSeverity: 'error',
  defaultEnabled: true,

  check({ app, graph, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    for (const plugin of app.plugins) {
      if (!plugin.isActive) continue;

      const pluginNodeId = `plugin_${plugin.id}`;
      const node = graph.getNode(pluginNodeId);
      if (!node) continue;

      const incomingCount = graph.getIncomingCount(pluginNodeId);

      if (incomingCount === 0) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          // Plugin usage is partially based on trigger types that look like plugin IDs
          // so we give MEDIUM confidence to avoid false positives
          confidence: 'MEDIUM',
          category: this.category,
          message: `Plugin "${plugin.name}" is installed but no elements or workflows appear to use it`,
          location: {
            type: 'plugin',
            id: pluginNodeId,
            name: plugin.name,
          },
          safeToDelete: false, // Never auto-delete plugins — too risky
          impactedBy: [],
          suggestion: `Check the Bubble editor to confirm no elements or workflows use this plugin. If unused, uninstall it via Settings → Plugins to improve performance.`,
          metadata: {
            pluginId: plugin.id,
            pluginName: plugin.name,
          },
        });
      }
    }

    return findings;
  },
};
