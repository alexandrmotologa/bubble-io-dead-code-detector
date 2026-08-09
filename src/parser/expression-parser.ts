/**
 * Expression traversal utilities.
 * Extracts all references (data type slugs, field slugs, element ids,
 * option set slugs, style ids) from Bubble's nested expression trees.
 */

import type { BubbleExpression, BubbleTextExpression } from './schema.js';

export interface ExtractedRefs {
  dataTypeSlugs: Set<string>;
  fieldSlugs: Set<string>;       // format: "dataTypeSlug.fieldSlug"
  elementIds: Set<string>;
  optionSetSlugs: Set<string>;
  styleIds: Set<string>;
  pluginIds: Set<string>;
}

export function createEmptyRefs(): ExtractedRefs {
  return {
    dataTypeSlugs: new Set(),
    fieldSlugs: new Set(),
    elementIds: new Set(),
    optionSetSlugs: new Set(),
    styleIds: new Set(),
    pluginIds: new Set(),
  };
}

export function mergeRefs(target: ExtractedRefs, source: ExtractedRefs): void {
  source.dataTypeSlugs.forEach((v) => target.dataTypeSlugs.add(v));
  source.fieldSlugs.forEach((v) => target.fieldSlugs.add(v));
  source.elementIds.forEach((v) => target.elementIds.add(v));
  source.optionSetSlugs.forEach((v) => target.optionSetSlugs.add(v));
  source.styleIds.forEach((v) => target.styleIds.add(v));
  source.pluginIds.forEach((v) => target.pluginIds.add(v));
}

/**
 * Recursively traverses a Bubble expression tree and collects all references.
 */
export function extractRefsFromExpression(
  expr: unknown,
  refs: ExtractedRefs,
  depth = 0,
): void {
  if (!expr || typeof expr !== 'object' || depth > 50) return;

  const e = expr as BubbleExpression;

  // Element references
  if (e.properties?.element_id) {
    refs.elementIds.add(e.properties.element_id);
  }

  // Data type / Search references
  if (e.type === 'Search' && e.properties?.type_to_find) {
    const typeSlug = e.properties.type_to_find.replace('custom.', '');
    refs.dataTypeSlugs.add(typeSlug);
  }

  // Option Set references
  if (e.properties?.option_set) {
    const osSlug = e.properties.option_set.replace('option.', '');
    refs.optionSetSlugs.add(osSlug);
  }

  // Field references — captured via 'name' on message calls
  // Bubble encodes field access as chained Message nodes
  if (e.type === 'Message' && e.name) {
    // Field slugs end with _text, _number, _boolean, _image, _date, etc.
    // or are custom field slug patterns
    if (isFieldSlugPattern(e.name)) {
      refs.fieldSlugs.add(e.name);
    }
  }

  // Recurse into next
  if (e.next) {
    extractRefsFromExpression(e.next, refs, depth + 1);
  }

  // Recurse into args
  if (e.args && typeof e.args === 'object') {
    extractRefsFromExpression(e.args, refs, depth + 1);
  }

  // Recurse into properties
  if (e.properties) {
    for (const val of Object.values(e.properties)) {
      if (val && typeof val === 'object') {
        extractRefsFromExpression(val, refs, depth + 1);
      }
    }
  }
}

/**
 * Extracts refs from a TextExpression (which has an entries map).
 */
export function extractRefsFromTextExpression(
  textExpr: BubbleTextExpression | undefined,
  refs: ExtractedRefs,
): void {
  if (!textExpr?.entries) return;
  for (const entry of Object.values(textExpr.entries)) {
    if (entry && typeof entry === 'object') {
      extractRefsFromExpression(entry, refs, 0);
    }
  }
}

/**
 * Recursively traverses any object/array and extracts all Bubble expression refs.
 */
export function extractRefsFromObject(obj: unknown, refs: ExtractedRefs, depth = 0): void {
  if (!obj || typeof obj !== 'object' || depth > 20) return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractRefsFromObject(item, refs, depth + 1);
    }
    return;
  }

  const o = obj as Record<string, unknown>;

  // Check if this is an expression node
  if (typeof o['type'] === 'string') {
    extractRefsFromExpression(o, refs, 0);
    return;
  }

  // Check if it's a TextExpression
  if (o['type'] === 'TextExpression' && o['entries']) {
    extractRefsFromTextExpression(o as unknown as BubbleTextExpression, refs);
    return;
  }

  // Otherwise recurse into all values
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object') {
      extractRefsFromObject(val, refs, depth + 1);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_SLUG_SUFFIXES = [
  '_text', '_number', '_boolean', '_image', '_file', '_date',
  '_list', '_address', '_geographic_address', '_option',
];

function isFieldSlugPattern(name: string): boolean {
  return FIELD_SLUG_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
