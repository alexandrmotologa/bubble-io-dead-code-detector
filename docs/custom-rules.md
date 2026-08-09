# Writing Custom Rules

## Overview

`bubble-io-dead-code-detector` has a plugin-style rule system. Every rule implements the `BubbleRule` interface and receives access to:
- The full **ParsedBubbleApp** (normalized app data)
- The **DependencyGraph** (reference graph)
- Per-rule **config** from `.bubblerc.json`

## Example: Custom Naming Convention Rule

This rule flags pages that don't follow a naming convention (e.g. snake_case):

```typescript
// src/analyzer/rules/naming.rule.ts
import type { BubbleRule, Finding, RuleContext } from './rule.interface.js';

export const namingConventionRule: BubbleRule = {
  id: 'naming-convention',
  name: 'Naming Convention',
  description: 'Ensures pages and data types follow naming conventions',
  category: 'naming',
  defaultSeverity: 'info',
  defaultEnabled: false, // opt-in

  check({ app, config }: RuleContext): Finding[] {
    const findings: Finding[] = [];
    const pattern = new RegExp(String(config['pattern'] ?? '^[a-z][a-z0-9_]*$'));

    for (const page of app.pages) {
      if (!pattern.test(page.name)) {
        findings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: config['severity'] as Finding['severity'] ?? 'info',
          confidence: 'HIGH',
          category: this.category,
          message: `Page "${page.name}" doesn't match naming convention: ${pattern}`,
          location: { type: 'page', id: page.id, name: page.name },
          safeToDelete: false,
          impactedBy: [],
          suggestion: `Rename page to use ${pattern} convention`,
          metadata: { pageName: page.name },
        });
      }
    }
    return findings;
  },
};
```

Register it in `src/analyzer/rules/rule-engine.ts`:
```typescript
import { namingConventionRule } from './naming.rule.js';
export const ALL_RULES = [...existingRules, namingConventionRule];
```

Enable and configure in `.bubblerc.json`:
```json
{
  "rules": {
    "naming-convention": {
      "enabled": true,
      "severity": "warning",
      "pattern": "^[a-z][a-z0-9_-]*$"
    }
  }
}
```

## Finding Structure

```typescript
interface Finding {
  ruleId: string;       // Unique rule identifier
  ruleName: string;     // Human-readable name
  severity: 'error' | 'warning' | 'info';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'dead-code' | 'complexity' | 'security' | 'naming' | 'quality';
  message: string;      // What was found
  location: {
    type: 'page' | 'element' | 'workflow' | 'field' | 'data_type' | ...;
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
  };
  safeToDelete: boolean; // Can the cleaner auto-remove this?
  impactedBy: string[];  // Other node IDs that would be affected
  suggestion: string;    // Actionable recommendation
  metadata: Record<string, unknown>; // Rule-specific extra data
}
```

## Confidence Levels

| Level | When to use |
|---|---|
| `HIGH` | 100% certain — e.g. workflow with no button, field with zero static references |
| `MEDIUM` | Likely but could have dynamic references — e.g. relational fields, plugin events |
| `LOW` | Hint — use for informational findings |

## Using the Dependency Graph

```typescript
// Check if a node has any references
const incomingCount = graph.getIncomingCount(nodeId);
if (incomingCount === 0) {
  // Node is unreferenced / dead
}

// Get all nodes of a kind
const allFields = graph.getNodesByKind('field');

// Get nodes that reference this node
const parents = graph.getIncomingNodes(nodeId);

// Get nodes this node references
const children = graph.getOutgoingNodes(nodeId);
```

## Accessing ParsedBubbleApp

```typescript
// All pages
app.pages // ParsedPage[]

// All elements on all pages (flattened)
import { flattenElements } from '../graph/edge-resolver.js';
const allElements = app.pages.flatMap(p => flattenElements(p.elements));

// All data type fields
const allFields = app.dataTypes.flatMap(dt => dt.fields);

// All workflows (page + reusable element)
const allWorkflows = [
  ...app.pages.flatMap(p => p.workflows),
  ...app.reusableElements.flatMap(re => re.workflows),
];
```
