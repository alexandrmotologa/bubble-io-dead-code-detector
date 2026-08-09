/**
 * SARIF 2.1 reporter — for GitHub Actions / GitLab CI / Azure DevOps integration
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AnalysisResult } from '../analyzer/index.js';
import type { Finding } from '../analyzer/rules/rule.interface.js';

export function writeSarifReport(
  result: AnalysisResult,
  outputDir: string,
): string {
  mkdirSync(outputDir, { recursive: true });

  const sarif = {
    $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'bubble-io-dead-code-detector',
            version: '1.0.0',
            informationUri: 'https://github.com/alexandrmotologa/bubble-io-dead-code-detector',
            rules: buildSarifRules(result.findings),
          },
        },
        results: result.findings.map((f) => buildSarifResult(f)),
        artifacts: [
          {
            location: { uri: result.app.meta.id + '.bubble' },
            description: {
              text: `Bubble.io app export for ${result.app.meta.id}`,
            },
          },
        ],
      },
    ],
  };

  const outputPath = join(outputDir, 'audit-report.sarif');
  writeFileSync(outputPath, JSON.stringify(sarif, null, 2), 'utf-8');
  return outputPath;
}

function buildSarifRules(findings: Finding[]): unknown[] {
  const seen = new Set<string>();
  const rules: unknown[] = [];

  for (const f of findings) {
    if (seen.has(f.ruleId)) continue;
    seen.add(f.ruleId);

    rules.push({
      id: f.ruleId,
      name: f.ruleName,
      shortDescription: { text: f.message },
      defaultConfiguration: {
        level: severityToSarif(f.severity),
      },
    });
  }

  return rules;
}

function buildSarifResult(f: Finding): unknown {
  return {
    ruleId: f.ruleId,
    level: severityToSarif(f.severity),
    message: { text: f.message },
    locations: [
      {
        logicalLocations: [
          {
            name: f.location.name,
            kind: f.location.type,
            fullyQualifiedName: f.location.parentName
              ? `${f.location.parentName} → ${f.location.name}`
              : f.location.name,
          },
        ],
      },
    ],
    properties: {
      confidence: f.confidence,
      category: f.category,
      safeToDelete: f.safeToDelete,
      suggestion: f.suggestion,
    },
  };
}

function severityToSarif(severity: string): string {
  const map: Record<string, string> = {
    error: 'error',
    warning: 'warning',
    info: 'note',
  };
  return map[severity] ?? 'note';
}
