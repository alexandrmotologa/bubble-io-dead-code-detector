/**
 * Parser orchestrator — coordinates all sub-parsers and
 * returns a clean ParsedBubbleApp ready for analysis.
 */

import type { BubbleApp, ParsedBubbleApp, ParsedElement } from './schema.js';
import { parsePages, parseWorkflows } from './page-parser.js';
import { parseDataTypes, parseOptionSets, parseStyles, parsePlugins } from './database-parser.js';
import { parseApiWorkflows, parseReusableElements } from './element-parser.js';
import { createEmptyRefs, extractRefsFromObject } from './expression-parser.js';

export { readBubbleFile, BubbleReadError } from './bubble-reader.js';
export type { BubbleApp, ParsedBubbleApp } from './schema.js';

/**
 * Main entry point: reads and parses a BubbleApp into a ParsedBubbleApp.
 * All sub-parsers are synchronous and run sequentially.
 */
export function parseBubbleApp(app: BubbleApp): ParsedBubbleApp {
  const pages = parsePages(app);
  const reusableElements = parseReusableElements(app);
  const apiWorkflows = parseApiWorkflows(app);
  const dataTypes = parseDataTypes(app);
  const optionSets = parseOptionSets(app);
  const styles = parseStyles(app);
  const plugins = parsePlugins(app);

  // Collect existing Bubble-detected issues from _index
  const rawIssues = app._index?.issues_list ?? {};
  const existingIssues = Object.values(rawIssues).flat();

  return {
    meta: {
      id: app._id,
      version: app.app_version ?? 'unknown',
      lastChange: new Date(
        typeof app.last_change === 'number'
          ? app.last_change
          : app.last_change_date ?? 0,
      ),
      createdAt: new Date(app.creation_date ?? 0),
    },
    pages,
    reusableElements,
    apiWorkflows,
    dataTypes,
    optionSets,
    styles,
    plugins,
    existingIssues,
  };
}
