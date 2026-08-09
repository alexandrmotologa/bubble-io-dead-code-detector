import type {
  BubbleApp,
  ParsedDataType,
  ParsedField,
  ParsedOptionSet,
  ParsedStyle,
  ParsedPlugin,
} from './schema.js';

// ─── Data Types ───────────────────────────────────────────────────────────────

export function parseDataTypes(app: BubbleApp): ParsedDataType[] {
  const result: ParsedDataType[] = [];

  for (const [typeSlug, rawType] of Object.entries(app.user_types)) {
    if (!rawType || typeof rawType !== 'object') continue;

    const fields: ParsedField[] = [];

    for (const [fieldSlug, rawField] of Object.entries(rawType.fields ?? {})) {
      if (!rawField || typeof rawField !== 'object') continue;

      const fieldType = rawField.value ?? 'unknown';
      const isRelational =
        fieldType.startsWith('custom.') || fieldType.startsWith('list_custom.');
      const relatedTypeId = isRelational
        ? fieldType.replace('custom.', '').replace('list_custom.', '')
        : undefined;

      fields.push({
        id: fieldSlug,
        name: rawField.display ?? fieldSlug,
        type: fieldType,
        dataTypeId: typeSlug,
        isRelational,
        relatedTypeId,
      });
    }

    result.push({
      id: typeSlug,
      name: rawType.display ?? typeSlug,
      fields,
      hasPrivacyRules:
        rawType.privacy_role != null &&
        Object.keys(rawType.privacy_role as object).length > 0,
      isExposedViaApi:
        rawType.exposed_api != null &&
        Object.keys(rawType.exposed_api as object).length > 0,
    });
  }

  return result;
}

// ─── Option Sets ──────────────────────────────────────────────────────────────

export function parseOptionSets(app: BubbleApp): ParsedOptionSet[] {
  const result: ParsedOptionSet[] = [];

  for (const [osSlug, rawOs] of Object.entries(app.option_sets)) {
    if (!rawOs || typeof rawOs !== 'object') continue;

    result.push({
      id: osSlug,
      name: rawOs.display ?? osSlug,
      optionCount: Object.keys(rawOs.values ?? {}).length,
      attributeCount: Object.keys(rawOs.attributes ?? {}).length,
    });
  }

  return result;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export function parseStyles(app: BubbleApp): ParsedStyle[] {
  const result: ParsedStyle[] = [];

  for (const [, rawStyle] of Object.entries(app.styles)) {
    if (!rawStyle || typeof rawStyle !== 'object') continue;
    result.push({
      id: rawStyle.id ?? '',
      name: (rawStyle.name as string | undefined) ?? rawStyle.id ?? '',
      elementType: (rawStyle.element_type as string | undefined) ?? undefined,
    });
  }

  return result;
}

// ─── Plugins ──────────────────────────────────────────────────────────────────

/**
 * Extracts installed plugins from settings.client_safe.plugins
 * In the real .bubble format, plugins is a map of plugin_id -> boolean (true = active)
 * Some entries may be objects with additional metadata.
 */
export function parsePlugins(app: BubbleApp): ParsedPlugin[] {
  const result: ParsedPlugin[] = [];
  const plugins = app.settings?.client_safe?.plugins;

  if (!plugins || typeof plugins !== 'object') return result;

  for (const [pluginId, value] of Object.entries(plugins)) {
    if (typeof value === 'boolean') {
      result.push({
        id: pluginId,
        name: humanizePluginId(pluginId),
        isActive: value,
      });
    } else if (value && typeof value === 'object') {
      const p = value as Record<string, unknown>;
      result.push({
        id: pluginId,
        name: (p['name'] as string | undefined) ?? humanizePluginId(pluginId),
        isActive: true,
      });
    }
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanizePluginId(id: string): string {
  // Plugin IDs are numeric like '1604083196447x185573648335896580'
  // Try to extract a human-readable name if possible
  return `Plugin [${id.slice(0, 16)}...]`;
}
