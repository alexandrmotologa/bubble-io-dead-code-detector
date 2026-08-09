/**
 * Builds the dependency graph from a ParsedBubbleApp.
 * Adds all nodes first, then resolves edges between them.
 */

import type { ParsedBubbleApp, ParsedElement, ParsedWorkflow } from '../../parser/schema.js';
import { DependencyGraph } from './dag.js';

export function buildDependencyGraph(app: ParsedBubbleApp): DependencyGraph {
  const graph = new DependencyGraph();

  // ─── 1. Add all nodes ──────────────────────────────────────────────────────

  // Pages
  for (const page of app.pages) {
    graph.addNode({ id: page.id, kind: 'page', name: page.name, metadata: {} });

    // Elements on this page
    addElementNodes(graph, page.elements, page.id);

    // Workflows on this page
    for (const wf of page.workflows) {
      graph.addNode({
        id: wf.id,
        kind: 'workflow',
        name: wf.name,
        metadata: {
          triggerType: wf.triggerType,
          isCustomEvent: wf.isCustomEvent,
          isServerSide: wf.isServerSide,
          actionCount: wf.actionCount,
          parentId: page.id,
        },
      });
    }
  }

  // Reusable elements
  for (const re of app.reusableElements) {
    graph.addNode({
      id: re.id,
      kind: 'reusable_element',
      name: re.name,
      metadata: {},
    });
    addElementNodes(graph, re.elements, re.id);
    for (const wf of re.workflows) {
      graph.addNode({
        id: wf.id,
        kind: 'workflow',
        name: wf.name,
        metadata: {
          triggerType: wf.triggerType,
          isCustomEvent: wf.isCustomEvent,
          actionCount: wf.actionCount,
          parentId: re.id,
        },
      });
    }
  }

  // API / Backend workflows
  for (const wf of app.apiWorkflows) {
    graph.addNode({
      id: wf.id,
      kind: 'api_workflow',
      name: wf.name,
      metadata: { type: wf.type, actionCount: wf.actionCount },
    });
  }

  // Data types
  for (const dt of app.dataTypes) {
    graph.addNode({
      id: `dt_${dt.id}`,
      kind: 'data_type',
      name: dt.name,
      metadata: {
        slug: dt.id,
        hasPrivacyRules: dt.hasPrivacyRules,
        isExposedViaApi: dt.isExposedViaApi,
        fieldCount: dt.fields.length,
      },
    });

    // Fields
    for (const field of dt.fields) {
      graph.addNode({
        id: `field_${dt.id}_${field.id}`,
        kind: 'field',
        name: `${dt.name} → ${field.name}`,
        metadata: {
          slug: field.id,
          dataTypeSlug: dt.id,
          type: field.type,
          isRelational: field.isRelational,
          relatedTypeId: field.relatedTypeId,
        },
      });
      // Field is contained by its data type
      graph.addEdge({
        from: `dt_${dt.id}`,
        to: `field_${dt.id}_${field.id}`,
        type: 'contains',
      });
    }
  }

  // Option sets
  for (const os of app.optionSets) {
    graph.addNode({
      id: `os_${os.id}`,
      kind: 'option_set',
      name: os.name,
      metadata: { slug: os.id, optionCount: os.optionCount },
    });
  }

  // Styles
  for (const style of app.styles) {
    graph.addNode({
      id: `style_${style.id}`,
      kind: 'style',
      name: style.name || style.id,
      metadata: { elementType: style.elementType },
    });
  }

  // Plugins
  for (const plugin of app.plugins) {
    graph.addNode({
      id: `plugin_${plugin.id}`,
      kind: 'plugin',
      name: plugin.name,
      metadata: { isActive: plugin.isActive },
    });
  }

  // ─── 2. Resolve edges ─────────────────────────────────────────────────────

  // Pages → elements (containment)
  for (const page of app.pages) {
    for (const el of flattenElements(page.elements)) {
      graph.addEdge({ from: page.id, to: el.id, type: 'contains' });
    }

    // Page workflows → triggering element
    for (const wf of page.workflows) {
      // Workflow belongs to page
      graph.addEdge({ from: page.id, to: wf.id, type: 'contains' });

      // ButtonClicked → button element
      if (wf.triggerElementId && graph.hasNode(wf.triggerElementId)) {
        graph.addEdge({
          from: wf.triggerElementId,
          to: wf.id,
          type: 'triggers',
        });
      }

      // Workflow references data types / fields / option sets
      addWorkflowReferenceEdges(graph, wf);
    }
  }

  // Reusable elements
  for (const re of app.reusableElements) {
    for (const wf of re.workflows) {
      graph.addEdge({ from: re.id, to: wf.id, type: 'contains' });
      if (wf.triggerElementId && graph.hasNode(wf.triggerElementId)) {
        graph.addEdge({
          from: wf.triggerElementId,
          to: wf.id,
          type: 'triggers',
        });
      }
      addWorkflowReferenceEdges(graph, wf);
    }
  }

  // API workflows → data types/fields
  for (const wf of app.apiWorkflows) {
    if (wf.referencedDataTypeSlug) {
      const dtNodeId = `dt_${wf.referencedDataTypeSlug}`;
      if (graph.hasNode(dtNodeId)) {
        graph.addEdge({ from: wf.id, to: dtNodeId, type: 'references' });
      }
    }
    for (const fieldSlug of wf.referencedFieldSlugs) {
      addFieldEdgesFromSlug(graph, wf.id, fieldSlug, app);
    }
  }

  // Elements → styles and plugins
  for (const page of app.pages) {
    for (const el of flattenElements(page.elements)) {
      addElementReferenceEdges(graph, el, app);
    }
  }
  for (const re of app.reusableElements) {
    for (const el of flattenElements(re.elements)) {
      addElementReferenceEdges(graph, el, app);
    }
  }

  return graph;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addElementNodes(
  graph: DependencyGraph,
  elements: ParsedElement[],
  parentId: string,
): void {
  for (const el of elements) {
    graph.addNode({
      id: el.id,
      kind: 'element',
      name: el.name,
      metadata: {
        type: el.type,
        pageId: el.pageId,
        parentId: el.parentId ?? parentId,
        isVisible: el.isVisible,
        isPermanentlyHidden: el.isPermanentlyHidden,
        isPluginElement: el.isPluginElement,
        pluginId: el.pluginId,
      },
    });
    if (el.children.length > 0) {
      addElementNodes(graph, el.children, el.id);
    }
  }
}

function addWorkflowReferenceEdges(
  graph: DependencyGraph,
  wf: ParsedWorkflow,
): void {
  if (wf.referencedDataTypeSlug) {
    const dtNodeId = `dt_${wf.referencedDataTypeSlug}`;
    if (graph.hasNode(dtNodeId)) {
      graph.addEdge({ from: wf.id, to: dtNodeId, type: 'references' });
    }
  }
}

function addElementReferenceEdges(
  graph: DependencyGraph,
  el: ParsedElement,
  app: ParsedBubbleApp,
): void {
  // Style references
  for (const styleRef of el.referencedStyles) {
    const styleNodeId = `style_${styleRef}`;
    if (graph.hasNode(styleNodeId)) {
      graph.addEdge({ from: el.id, to: styleNodeId, type: 'styles' });
    }
  }

  // Plugin element → plugin node
  if (el.isPluginElement && el.pluginId) {
    const pluginNodeId = `plugin_${el.pluginId}`;
    if (graph.hasNode(pluginNodeId)) {
      graph.addEdge({ from: el.id, to: pluginNodeId, type: 'references' });
    }
  }

  // Option set references
  for (const osRef of el.referencedOptionSets) {
    const osNodeId = `os_${osRef}`;
    if (graph.hasNode(osNodeId)) {
      graph.addEdge({ from: el.id, to: osNodeId, type: 'references' });
    }
  }

  // Data type reference
  if (el.referencedDataTypeSlug) {
    const dtNodeId = `dt_${el.referencedDataTypeSlug}`;
    if (graph.hasNode(dtNodeId)) {
      graph.addEdge({ from: el.id, to: dtNodeId, type: 'references' });
    }
  }

  // Field slug references
  for (const fieldSlug of el.referencedFieldSlugs) {
    addFieldEdgesFromSlug(graph, el.id, fieldSlug, app);
  }
}

function addFieldEdgesFromSlug(
  graph: DependencyGraph,
  fromId: string,
  fieldSlug: string,
  app: ParsedBubbleApp,
): void {
  // Find which data type owns this field slug
  for (const dt of app.dataTypes) {
    const field = dt.fields.find((f) => f.id === fieldSlug);
    if (field) {
      const fieldNodeId = `field_${dt.id}_${field.id}`;
      if (graph.hasNode(fieldNodeId)) {
        graph.addEdge({ from: fromId, to: fieldNodeId, type: 'references' });
      }
    }
  }
}

export function flattenElements(elements: ParsedElement[]): ParsedElement[] {
  const result: ParsedElement[] = [];
  for (const el of elements) {
    result.push(el);
    if (el.children.length > 0) {
      result.push(...flattenElements(el.children));
    }
  }
  return result;
}
