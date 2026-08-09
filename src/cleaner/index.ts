/**
 * Cleaner — safe dead code removal with mandatory backup and dry-run support.
 *
 * Supported --only targets:
 *   dead-plugin     → removes from settings.client_safe.plugins
 *   dead-option-set → removes from option_sets
 *   dead-style      → removes from styles
 *   (dead-workflow is patched if it has 0 actions)
 *
 * All targets are opt-in via --only flag. None are applied by default.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { join, resolve, basename, extname } from 'path';
import type { AnalysisResult } from '../analyzer/index.js';
import type { Finding } from '../analyzer/rules/rule.interface.js';

export interface CleanOptions {
  inputFile: string;
  outputFile: string;
  backupDir: string;
  dryRun: boolean;
  minConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  only?: string[];
}

export interface CleanResult {
  dryRun: boolean;
  itemsRemoved: number;
  itemsSkipped: number;
  backupPath: string | null;
  outputPath: string | null;
  removedItems: Array<{ ruleId: string; name: string; id: string }>;
  skippedItems: Array<{ ruleId: string; name: string; reason: string }>;
}

/**
 * SAFE CLEAN: Creates backup → filters safe-to-delete findings → applies patches → writes output
 */
export function cleanBubbleApp(
  analysisResult: AnalysisResult,
  options: CleanOptions,
): CleanResult {
  const safeFindings = getSafeToDeleteFindings(
    analysisResult.findings,
    options.minConfidence,
    options.only,
  );

  const skipped = analysisResult.findings
    .filter((f) => !safeFindings.includes(f))
    .map((f) => ({
      ruleId: f.ruleId,
      name: f.location.name,
      reason: f.safeToDelete
        ? `Confidence too low: ${f.confidence}`
        : 'Not safe to auto-delete',
    }));

  if (options.dryRun) {
    return {
      dryRun: true,
      itemsRemoved: 0,
      itemsSkipped: safeFindings.length + skipped.length,
      backupPath: null,
      outputPath: null,
      removedItems: safeFindings.map((f) => ({
        ruleId: f.ruleId,
        name: f.location.name,
        id: f.location.id,
      })),
      skippedItems: skipped,
    };
  }

  // Create backup BEFORE any modification
  const backupPath = createBackup(options.inputFile, options.backupDir);

  // Load original JSON
  const rawJson = JSON.parse(readFileSync(resolve(options.inputFile), 'utf-8')) as Record<string, unknown>;

  const removed: Array<{ ruleId: string; name: string; id: string }> = [];

  for (const finding of safeFindings) {
    const patched = applyPatch(rawJson, finding);
    if (patched) {
      removed.push({
        ruleId: finding.ruleId,
        name: finding.location.name,
        id: finding.location.id,
      });
    }
  }

  const outputPath = resolve(options.outputFile);
  writeFileSync(outputPath, JSON.stringify(rawJson, null, 2), 'utf-8');

  return {
    dryRun: false,
    itemsRemoved: removed.length,
    itemsSkipped: skipped.length,
    backupPath,
    outputPath,
    removedItems: removed,
    skippedItems: skipped,
  };
}

// ─── Patch Dispatch ────────────────────────────────────────────────────────────

function applyPatch(rawJson: Record<string, unknown>, finding: Finding): boolean {
  switch (finding.ruleId) {
    case 'dead-workflow':
      // Only patch empty workflows (0 actions)
      if ((finding.metadata['actionCount'] as number) === 0) {
        return patchDeadWorkflow(rawJson, finding.location.id);
      }
      return false;

    case 'dead-plugin':
      return patchDeadPlugin(rawJson, finding.metadata['pluginId'] as string);

    case 'dead-option-set':
      return patchDeadOptionSet(rawJson, finding.metadata['optionSetId'] as string);

    case 'dead-style':
      return patchDeadStyle(rawJson, finding.metadata['styleId'] as string);

    default:
      return false;
  }
}

// ─── Individual Patchers ───────────────────────────────────────────────────────

function patchDeadWorkflow(rawJson: Record<string, unknown>, workflowId: string): boolean {
  const pages = rawJson['pages'] as Record<string, unknown> | undefined;
  if (pages) {
    for (const page of Object.values(pages)) {
      const p = page as Record<string, unknown>;
      const workflows = p['workflows'] as Record<string, unknown> | undefined;
      if (workflows && workflows[workflowId]) {
        delete workflows[workflowId];
        return true;
      }
    }
  }
  const elementDefs = rawJson['element_definitions'] as Record<string, unknown> | undefined;
  if (elementDefs) {
    for (const el of Object.values(elementDefs)) {
      const e = el as Record<string, unknown>;
      const workflows = e['workflows'] as Record<string, unknown> | undefined;
      if (workflows && workflows[workflowId]) {
        delete workflows[workflowId];
        return true;
      }
    }
  }
  return false;
}

/**
 * Removes an inactive plugin from settings.client_safe.plugins
 */
function patchDeadPlugin(rawJson: Record<string, unknown>, pluginId: string): boolean {
  try {
    const settings = rawJson['settings'] as Record<string, unknown> | undefined;
    const clientSafe = settings?.['client_safe'] as Record<string, unknown> | undefined;
    const plugins = clientSafe?.['plugins'] as Record<string, unknown> | undefined;
    if (plugins && pluginId in plugins) {
      delete plugins[pluginId];
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Removes an unused option set from the option_sets top-level map
 */
function patchDeadOptionSet(rawJson: Record<string, unknown>, optionSetId: string): boolean {
  try {
    const optionSets = rawJson['option_sets'] as Record<string, unknown> | undefined;
    if (optionSets && optionSetId in optionSets) {
      delete optionSets[optionSetId];
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Removes an unused style from the styles top-level map
 */
function patchDeadStyle(rawJson: Record<string, unknown>, styleId: string): boolean {
  try {
    const styles = rawJson['styles'] as Record<string, unknown> | undefined;
    if (styles && styleId in styles) {
      delete styles[styleId];
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSafeToDeleteFindings(
  findings: Finding[],
  minConfidence: 'HIGH' | 'MEDIUM' | 'LOW',
  only?: string[],
): Finding[] {
  const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const minOrder = confOrder[minConfidence];
  return findings.filter((f) => {
    if (!f.safeToDelete) return false;
    if (confOrder[f.confidence] > minOrder) return false;
    if (only && !only.includes(f.ruleId)) return false;
    return true;
  });
}

function createBackup(inputFile: string, backupDir: string): string {
  mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = basename(inputFile, extname(inputFile));
  const backupPath = join(backupDir, `${name}.${timestamp}.bubble.bak`);
  copyFileSync(resolve(inputFile), backupPath);
  return backupPath;
}

export function findLatestBackup(backupDir: string): string | null {
  if (!existsSync(backupDir)) return null;
  const files = readdirSync(backupDir)
    .filter((f: string) => f.endsWith('.bubble.bak'))
    .sort()
    .reverse();
  return files.length > 0 ? join(backupDir, files[0]) : null;
}
