import type {
  BubbleApp,
  ParsedReusableElement,
  ParsedElement,
  ParsedApiWorkflow,
} from './schema.js';
import { parseWorkflows } from './page-parser.js';
import {
  createEmptyRefs,
  extractRefsFromObject,
} from './expression-parser.js';

// ─── Reusable Elements ────────────────────────────────────────────────────────

export function parseReusableElements(app: BubbleApp): ParsedReusableElement[] {
  const result: ParsedReusableElement[] = [];

  for (const [elemId, rawEl] of Object.entries(app.element_definitions)) {
    if (!rawEl || typeof rawEl !== 'object') continue;

    const elements = parseElementsFlat(rawEl.elements ?? {}, elemId);
    const workflows = parseWorkflows(
      rawEl.workflows ?? {},
      elemId,
      'reusable_element',
    );

    result.push({
      id: elemId,
      name: rawEl.name ?? elemId,
      elements,
      workflows,
    });
  }

  return result;
}

/**
 * Parses element tree for reusable elements (same logic as pages).
 */
function parseElementsFlat(
  elements: Record<string, unknown>,
  parentId: string,
): ParsedElement[] {
  const result: ParsedElement[] = [];

  for (const [, rawEl] of Object.entries(elements)) {
    if (!rawEl || typeof rawEl !== 'object') continue;
    const el = rawEl as Record<string, unknown>;

    const refs = createEmptyRefs();
    if (el['properties']) extractRefsFromObject(el['properties'], refs);
    if (el['states']) extractRefsFromObject(el['states'], refs);

    const styleRef = el['style'];
    if (typeof styleRef === 'string') refs.styleIds.add(styleRef);

    const isVisible = el['properties']
      ? (el['properties'] as Record<string, unknown>)['is_visible'] !== false
      : true;

    const children = parseElementsFlat(
      (el['elements'] as Record<string, unknown>) ?? {},
      parentId,
    );

    const elType = String(el['type'] ?? 'Unknown');
    const isPlugin = /^\d{16,}x\d+/.test(elType);
    const conditionCount = el['states'] ? Object.keys(el['states'] as object).length : 0;

    const gtRaw = el['properties']
      ? String((el['properties'] as Record<string, unknown>)['group_type'] ?? '')
      : '';
    if (gtRaw.startsWith('custom.')) refs.dataTypeSlugs.add(gtRaw.replace('custom.', ''));
    if (gtRaw.startsWith('option.')) refs.optionSetSlugs.add(gtRaw.replace('option.', ''));

    result.push({
      id: String(el['id'] ?? `el_${Math.random().toString(36).slice(2)}`),
      type: elType,
      name: String(el['name'] ?? el['default_name'] ?? elType),
      pageId: parentId,
      parentId: undefined,
      isVisible,
      isPermanentlyHidden: !isVisible,
      referencedDataTypeSlug: refs.dataTypeSlugs.size > 0 ? [...refs.dataTypeSlugs][0] : undefined,
      referencedFieldSlugs: [...refs.fieldSlugs],
      referencedOptionSets: [...refs.optionSetSlugs],
      referencedStyles: [...refs.styleIds],
      referencedElementIds: [...refs.elementIds],
      children,
      hasConditions: conditionCount > 0,
      conditionCount,
      isPluginElement: isPlugin,
      pluginId: isPlugin ? (elType.match(/^(\d+x\d+)/)?.[1]) : undefined,
    });
  }

  return result;
}

// ─── API / Backend Workflows ──────────────────────────────────────────────────

export function parseApiWorkflows(app: BubbleApp): ParsedApiWorkflow[] {
  const result: ParsedApiWorkflow[] = [];

  for (const [, rawWf] of Object.entries(app.api)) {
    if (!rawWf || typeof rawWf !== 'object') continue;

    const refs = createEmptyRefs();
    if (rawWf.actions) extractRefsFromObject(rawWf.actions, refs);

    const actionCount = rawWf.actions ? Object.keys(rawWf.actions).length : 0;
    const name =
      (rawWf.properties?.['name'] as string | undefined) ??
      `${rawWf.type} [${rawWf.id}]`;

    result.push({
      id: rawWf.id,
      name,
      type: rawWf.type ?? 'APIEvent',
      actionCount,
      referencedDataTypeSlug:
        refs.dataTypeSlugs.size > 0 ? [...refs.dataTypeSlugs][0] : undefined,
      referencedFieldSlugs: [...refs.fieldSlugs],
      referencedOptionSets: [...refs.optionSetSlugs],
    });
  }

  return result;
}
