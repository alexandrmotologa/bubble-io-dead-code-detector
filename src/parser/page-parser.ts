import type {
  BubbleApp,
  BubbleElement,
  BubbleWorkflow,
  ParsedPage,
  ParsedElement,
  ParsedWorkflow,
} from './schema.js';
import {
  createEmptyRefs,
  extractRefsFromObject,
  extractRefsFromTextExpression,
  type ExtractedRefs,
} from './expression-parser.js';

/** Bubble trigger types that represent UI-driven events (not server-side) */
const CLIENT_TRIGGERS = new Set([
  'ButtonClicked',
  'PageLoaded',
  'LoggedIn',
  'LoggedOut',
  'InputChanged',
  'ConditionTrue',
  'CustomEvent',
  'DoInterval',
  'OnPageError',
]);

/** Trigger types that represent server-side / API events */
const SERVER_TRIGGERS = new Set([
  'APIEvent',
  'DatabaseTriggerEvent',
  'RecurringEvent',
]);

// ─────────────────────────────────────────────────────────────────────────────

export function parsePages(app: BubbleApp): ParsedPage[] {
  const pages: ParsedPage[] = [];

  for (const [pageId, rawPage] of Object.entries(app.pages)) {
    const elements = parseElementTree(
      rawPage.elements ?? {},
      pageId,
      undefined,
    );
    const workflows = parseWorkflows(
      rawPage.workflows ?? {},
      pageId,
      'page',
    );
    pages.push({
      id: pageId,
      name: rawPage.name ?? pageId,
      elements,
      workflows,
    });
  }

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────

function parseElementTree(
  elements: Record<string, BubbleElement>,
  pageId: string,
  parentId: string | undefined,
): ParsedElement[] {
  const result: ParsedElement[] = [];

  for (const [, rawEl] of Object.entries(elements)) {
    if (!rawEl || typeof rawEl !== 'object') continue;

    const refs = createEmptyRefs();

    // Extract refs from properties
    if (rawEl.properties) {
      extractRefsFromObject(rawEl.properties, refs);

      // Data source type
      if (rawEl.properties['group_type']) {
        const gtRaw = String(rawEl.properties['group_type']);
        const typeSlug = gtRaw.replace('custom.', '').replace('option.', '');
        if (gtRaw.startsWith('custom.')) refs.dataTypeSlugs.add(typeSlug);
        if (gtRaw.startsWith('option.')) refs.optionSetSlugs.add(typeSlug);
      }
    }

    // Extract refs from states
    if (rawEl.states) {
      extractRefsFromObject(rawEl.states, refs);
    }

    // Style reference
    const styleRef = rawEl.style;
    if (styleRef) refs.styleIds.add(styleRef);

    // Determine visibility
    const isVisible = rawEl.properties?.['is_visible'] !== false;
    const collapseWhenHidden = rawEl.properties?.['collapse_when_hidden'] === true;

    // Detect plugin elements (id contains timestamp pattern)
    const isPluginElement = isPluginElementType(rawEl.type ?? '');
    const pluginId = isPluginElement
      ? extractPluginIdFromElementType(rawEl.type ?? '')
      : undefined;

    // Count conditions
    const conditionCount = rawEl.states
      ? Object.keys(rawEl.states).length
      : 0;

    // Parse children recursively
    const children = parseElementTree(
      rawEl.elements ?? {},
      pageId,
      rawEl.id ?? undefined,
    );

    result.push({
      id: rawEl.id ?? generateFallbackId(rawEl),
      type: rawEl.type ?? 'Unknown',
      name: rawEl.name ?? rawEl.default_name ?? rawEl.type ?? 'Unnamed',
      pageId,
      parentId,
      isVisible,
      isPermanentlyHidden: !isVisible && !collapseWhenHidden,
      referencedDataTypeSlug:
        refs.dataTypeSlugs.size > 0
          ? [...refs.dataTypeSlugs][0]
          : undefined,
      referencedFieldSlugs: [...refs.fieldSlugs],
      referencedOptionSets: [...refs.optionSetSlugs],
      referencedStyles: [...refs.styleIds],
      referencedElementIds: [...refs.elementIds],
      children,
      hasConditions: conditionCount > 0,
      conditionCount,
      isPluginElement,
      pluginId,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

export function parseWorkflows(
  workflows: Record<string, BubbleWorkflow>,
  parentId: string,
  parentType: 'page' | 'reusable_element',
): ParsedWorkflow[] {
  const result: ParsedWorkflow[] = [];

  for (const [, rawWf] of Object.entries(workflows)) {
    if (!rawWf || typeof rawWf !== 'object') continue;

    const refs = createEmptyRefs();

    // Extract refs from all actions
    if (rawWf.actions) {
      extractRefsFromObject(rawWf.actions, refs);
    }

    const triggerType = rawWf.type ?? 'Unknown';
    const isServerSide = SERVER_TRIGGERS.has(triggerType);
    const isCustomEvent = triggerType === 'CustomEvent';
    const actionCount = rawWf.actions ? Object.keys(rawWf.actions).length : 0;

    result.push({
      id: rawWf.id ?? generateFallbackId(rawWf),
      name: buildWorkflowName(rawWf),
      triggerType,
      triggerElementId: rawWf.properties?.['element_id'] as string | undefined,
      isCustomEvent,
      isServerSide,
      actionCount,
      referencedDataTypeSlug:
        refs.dataTypeSlugs.size > 0 ? [...refs.dataTypeSlugs][0] : undefined,
      referencedFieldSlugs: [...refs.fieldSlugs],
      referencedOptionSets: [...refs.optionSetSlugs],
      referencedElementIds: [...refs.elementIds],
      parentId,
      parentType,
    });
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPluginElementType(type: string): boolean {
  // Plugin element types are long numeric IDs like '1604083196447x185573648335896580-AAC'
  return /^\d{16,}x\d+/.test(type);
}

function extractPluginIdFromElementType(type: string): string {
  // Extract the numeric plugin ID portion before the dash
  const match = type.match(/^(\d+x\d+)/);
  return match ? match[1] : type;
}

function buildWorkflowName(rawWf: BubbleWorkflow): string {
  if (rawWf.properties?.['event_name']) {
    return String(rawWf.properties['event_name']);
  }
  return `${rawWf.type ?? 'Workflow'} [${rawWf.id ?? 'unknown'}]`;
}

let _counter = 0;
function generateFallbackId(obj: unknown): string {
  return `fallback_${_counter++}_${JSON.stringify(obj).slice(0, 10)}`;
}
