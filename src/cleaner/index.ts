/**
 * Cleaner — safe dead code removal with mandatory backup and dry-run support.
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

  // Apply patches for each safe finding
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

  // Write cleaned output
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

/**
 * Applies a single patch to the raw JSON object.
 * Returns true if successfully patched, false if no patch was applied.
 *
 * Currently safe to delete: only empty workflows (0 actions, no trigger element found).
 * All other deletions are left to future versions after more extensive testing.
 */
function applyPatch(
  rawJson: Record<string, unknown>,
  finding: Finding,
): boolean {
  // Only auto-patch dead workflows with 0 actions for now (safest case)
  if (
    finding.ruleId === 'dead-workflow' &&
    (finding.metadata as Record<string, unknown>)['actionCount'] === 0
  ) {
    return patchDeadWorkflow(rawJson, finding.location.id, finding.location.parentId);
  }

  return false;
}

function patchDeadWorkflow(
  rawJson: Record<string, unknown>,
  workflowId: string,
  parentId?: string,
): boolean {
  // Try pages
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

  // Try element_definitions (reusable elements)
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
 * Finds the latest backup file for rollback
 */
export function findLatestBackup(backupDir: string): string | null {
  if (!existsSync(backupDir)) return null;

  const files = readdirSync(backupDir)
    .filter((f: string) => f.endsWith('.bubble.bak'))
    .sort()
    .reverse();

  return files.length > 0 ? join(backupDir, files[0]) : null;
}
