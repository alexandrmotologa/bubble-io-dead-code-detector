/**
 * Config loader — reads .bubblerc.json from cwd or specified path
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { z } from 'zod';

const RuleConfigSchema = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
}).passthrough();

const BubbleRcSchema = z.object({
  ignore: z.object({
    workflows: z.array(z.string()).optional(),
    fields: z.array(z.string()).optional(),
    pages: z.array(z.string()).optional(),
    plugins: z.array(z.string()).optional(),
  }).optional(),
  rules: z.record(z.string(), RuleConfigSchema).optional(),
  healthScore: z.object({
    failBelow: z.number().min(0).max(100).optional(),
    weights: z.record(z.string(), z.number()).optional(),
  }).optional(),
  output: z.object({
    dir: z.string().optional(),
    formats: z.array(z.enum(['json', 'html', 'markdown', 'sarif', 'csv'])).optional(),
    openHtmlAfterScan: z.boolean().optional(),
  }).optional(),
  clean: z.object({
    backupDir: z.string().optional(),
    minConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    requireConfirmation: z.boolean().optional(),
    dryRunFirst: z.boolean().optional(),
  }).optional(),
});

export type BubbleRcConfig = z.infer<typeof BubbleRcSchema>;

const DEFAULT_CONFIG: BubbleRcConfig = {
  rules: {},
  healthScore: { failBelow: 70 },
  output: { dir: './audit-results', formats: ['json', 'html'] },
  clean: {
    backupDir: './backups',
    minConfidence: 'HIGH',
    requireConfirmation: true,
    dryRunFirst: true,
  },
};

const CONFIG_NAMES = ['.bubblerc.json', '.bubblerc', 'bubblerc.json'];

export function loadConfig(cwd: string = process.cwd()): BubbleRcConfig {
  for (const name of CONFIG_NAMES) {
    const configPath = join(resolve(cwd), name);
    if (existsSync(configPath)) {
      try {
        const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
        const parsed = BubbleRcSchema.safeParse(raw);
        if (parsed.success) {
          return mergeWithDefaults(parsed.data);
        } else {
          console.warn(
            `[bubble-detector] Warning: .bubblerc.json has validation errors:\n${parsed.error.message}`,
          );
        }
      } catch (err) {
        console.warn(`[bubble-detector] Warning: Could not parse ${name}:`, err);
      }
    }
  }

  return DEFAULT_CONFIG;
}

function mergeWithDefaults(userConfig: BubbleRcConfig): BubbleRcConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    rules: { ...(DEFAULT_CONFIG.rules ?? {}), ...(userConfig.rules ?? {}) },
    output: { ...(DEFAULT_CONFIG.output ?? {}), ...(userConfig.output ?? {}) },
    clean: { ...(DEFAULT_CONFIG.clean ?? {}), ...(userConfig.clean ?? {}) },
    healthScore: {
      ...(DEFAULT_CONFIG.healthScore ?? {}),
      ...(userConfig.healthScore ?? {}),
    },
  };
}

export { DEFAULT_CONFIG };
