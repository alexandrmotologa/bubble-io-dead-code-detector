/**
 * Rule: Dead Style Detection
 * Rule: Dead Option Set Detection
 */

import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';
import { isIgnored } from './rule.interface.js';
import { getPluginName } from '../../data/plugin-registry.js';

export const deadStyleRule: BubbleRule = {
  id: 'dead-style',
  name: 'Unused Style',
  description: 'Detects styles defined in the app that are not applied to any element.',
  category: 'dead-code',
  defaultSeverity: 'info',
  defaultEnabled: true,

  check({ graph, config, ignore }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;
    const styleNodes = graph.getNodesByKind('style');

    for (const node of styleNodes) {
      if (isIgnored(node.id, node.name, [ignore.styles])) continue;
      const incomingCount = graph.getIncomingCount(node.id);

      if (incomingCount === 0) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'MEDIUM',
          category: this.category,
          message: `Style "${node.name}" is not applied to any element`,
          location: { type: 'style', id: node.id, name: node.name },
          safeToDelete: true, // safe — styles are standalone entries
          impactedBy: [],
          suggestion: `Remove this style from the Styles panel if no elements use it. Note: Bubble may not always expose all style references in the export.`,
          metadata: { styleId: node.id, elementType: node.metadata['elementType'] },
        });
      }
    }

    return findings;
  },
};

export const deadOptionSetRule: BubbleRule = {
  id: 'dead-option-set',
  name: 'Unused Option Set',
  description: 'Detects option sets that are not referenced by any element or workflow.',
  category: 'dead-code',
  defaultSeverity: 'warning',
  defaultEnabled: true,

  check({ graph, config, ignore }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;
    const osNodes = graph.getNodesByKind('option_set');

    for (const node of osNodes) {
      if (isIgnored(node.id, node.name, [ignore.optionSets])) continue;
      const incomingCount = graph.getIncomingCount(node.id);

      if (incomingCount === 0) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'MEDIUM',
          category: this.category,
          message: `Option Set "${node.name}" appears to be unused`,
          location: { type: 'option_set', id: node.id, name: node.name },
          safeToDelete: true, // safe — option sets are standalone entries
          impactedBy: [],
          suggestion: `Verify in the Bubble editor that this option set is not used in any dropdown, condition, or workflow. If confirmed, delete it.`,
          metadata: { optionSetId: node.id, optionCount: node.metadata['optionCount'] },
        });
      }
    }

    return findings;
  },
};

/**
 * Rule: Dead Plugin Detection (with plugin name registry lookup)
 */
export const deadPluginRule: BubbleRule = {
  id: 'dead-plugin',
  name: 'Inactive Plugin',
  description: 'Detects installed plugins that have no elements or workflows referencing them.',
  category: 'dead-code',
  defaultSeverity: 'error',
  defaultEnabled: true,

  check({ app, graph, config, ignore }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const severity = config['severity'] ?? this.defaultSeverity;

    for (const plugin of app.plugins) {
      if (!plugin.isActive) continue;
      if (isIgnored(plugin.id, plugin.name, [ignore.plugins])) continue;

      const pluginNodeId = `plugin_${plugin.id}`;
      const node = graph.getNode(pluginNodeId);
      if (!node) continue;

      const incomingCount = graph.getIncomingCount(pluginNodeId);

      if (incomingCount === 0) {
        // Look up human-readable name from plugin registry
        const knownName = getPluginName(plugin.id);
        const displayName = knownName ?? plugin.name;

        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: severity as Finding['severity'],
          confidence: 'MEDIUM',
          category: this.category,
          message: `Plugin "${displayName}" is installed but no elements or workflows appear to use it`,
          location: { type: 'plugin', id: pluginNodeId, name: displayName },
          safeToDelete: true, // safe — just removes from settings.client_safe.plugins
          impactedBy: [],
          suggestion: `Check the Bubble editor to confirm no elements or workflows use this plugin. If unused, uninstall it via Settings → Plugins to improve performance.`,
          metadata: { pluginId: plugin.id, pluginName: displayName, knownName },
        });
      }
    }

    return findings;
  },
};
