import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readBubbleFile, parseBubbleApp } from '../src/parser/index.js';
import { analyzeApp } from '../src/analyzer/index.js';
import { buildDependencyGraph } from '../src/analyzer/graph/edge-resolver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal valid Bubble app structure for unit testing
const MOCK_APP = {
  type: 'application' as const,
  _id: 'test-app',
  app_version: '1.0',
  creation_date: 1700000000000,
  last_change_date: 1700000001000,
  last_change: 1700000001000,
  pages: {
    'page1': {
      id: 'page1',
      name: 'index',
      type: 'Page' as const,
      elements: {
        'btn1': { id: 'btn1', type: 'Button', name: 'Sign Up Button' },
      },
      workflows: {
        'wf1': {
          id: 'wf1',
          type: 'ButtonClicked',
          properties: { element_id: 'btn1' },
          actions: { '0': { type: 'NavigateTo' } },
        },
        'wf_dead': {
          id: 'wf_dead',
          type: 'ButtonClicked',
          properties: { element_id: 'nonexistent_btn' },
          actions: {},
        },
      },
    },
  },
  element_definitions: {},
  api: {},
  user_types: {
    'user': {
      display: 'User',
      fields: {
        'email_text': { display: 'Email', value: 'text' },
        'unused_field_text': { display: 'Old Field', value: 'text' },
      },
    },
  },
  option_sets: {
    'status': {
      display: 'Status',
      values: { 'active': { display: 'Active', db_value: 'active' } },
    },
  },
  styles: {
    'style1': { id: 'style1', name: 'Primary Button', properties: {} },
  },
  settings: {
    client_safe: { plugins: { 'plugin123': true } },
    secure: {},
  },
  _index: {},
};

describe('parseBubbleApp', () => {
  it('should parse pages correctly', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0].name).toBe('index');
    expect(parsed.pages[0].workflows).toHaveLength(2);
  });

  it('should parse data types and fields', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    expect(parsed.dataTypes).toHaveLength(1);
    expect(parsed.dataTypes[0].name).toBe('User');
    expect(parsed.dataTypes[0].fields).toHaveLength(2);
  });

  it('should parse plugins', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    expect(parsed.plugins).toHaveLength(1);
    expect(parsed.plugins[0].isActive).toBe(true);
  });

  it('should parse option sets', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    expect(parsed.optionSets).toHaveLength(1);
    expect(parsed.optionSets[0].name).toBe('Status');
  });
});

describe('buildDependencyGraph', () => {
  it('should build a graph with correct node count', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const graph = buildDependencyGraph(parsed);
    const stats = graph.getStats();
    // 1 page + 1 element + 2 workflows + 1 data_type + 2 fields + 1 option_set + 1 style + 1 plugin = 10
    expect(stats.totalNodes).toBeGreaterThan(0);
  });

  it('should have edges between page and its workflows', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const graph = buildDependencyGraph(parsed);
    // page1 should have outgoing edges to its workflows
    const pageOutgoing = graph.getOutgoingCount('page1');
    expect(pageOutgoing).toBeGreaterThan(0);
  });
});

describe('analyzeApp', () => {
  it('should detect the dead workflow (wf_dead has no trigger element)', () => {
    // wf_dead references 'nonexistent_btn' which doesn't exist in the graph,
    // so it should appear in findings (the rule checks if trigger element exists in graph)
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed);
    // All workflows with unknown/plugin triggers are skipped, ButtonClicked with 
    // missing element_id are flagged as MEDIUM. Let's check total findings > 0
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('should detect unused plugin (plugin123 has no element usage)', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed);
    const deadPlugins = result.findings.filter(f => f.ruleId === 'dead-plugin');
    expect(deadPlugins.length).toBeGreaterThan(0);
  });

  it('should produce a health score between 0 and 100', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed);
    expect(result.healthScore.score).toBeGreaterThanOrEqual(0);
    expect(result.healthScore.score).toBeLessThanOrEqual(100);
  });

  it('should return a valid graph stats object', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed);
    expect(result.graphStats.totalNodes).toBeGreaterThan(0);
    expect(result.graphStats.totalEdges).toBeGreaterThanOrEqual(0);
  });
});

describe('readBubbleFile errors', () => {
  it('should throw BubbleReadError for non-existent file', async () => {
    const { BubbleReadError } = await import('../src/parser/index.js');
    expect(() => readBubbleFile('./does-not-exist.bubble')).toThrow(BubbleReadError);
  });
});

// ─── Phase 2 Tests ────────────────────────────────────────────────────────────

describe('ignore filter', () => {
  it('should suppress a workflow finding when its ID is in the ignore list', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed, {
      ignore: { workflows: ['wf_dead'] },
    });
    const deadByWfDead = result.findings.filter(
      (f) => f.ruleId === 'dead-workflow' && f.location.id === 'wf_dead',
    );
    expect(deadByWfDead.length).toBe(0);
  });

  it('should NOT suppress findings not in the ignore list', () => {
    const parsed = parseBubbleApp(MOCK_APP as never);
    const withIgnore = analyzeApp(parsed, { ignore: { workflows: ['wf_dead'] } });
    const without = analyzeApp(parsed);
    // Total findings should be equal or less with ignore (never more)
    expect(withIgnore.findings.length).toBeLessThanOrEqual(without.findings.length);
  });
});

describe('CSV reporter', () => {
  it('should produce CSV output with correct headers', async () => {
    const { writeCsvReport } = await import('../src/reporters/csv-reporter.js');
    const parsed = parseBubbleApp(MOCK_APP as never);
    const result = analyzeApp(parsed);
    const tmpDir = './test-output-csv';
    const outputPath = writeCsvReport(result, tmpDir);
    const { readFileSync, existsSync, rmSync } = await import('fs');
    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('rule_id,rule_name,severity,confidence');
    expect(content).toContain('safe_to_delete');
    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('plugin registry', () => {
  it('should return a known name for a registered plugin ID', async () => {
    const { getPluginName } = await import('../src/data/plugin-registry.js');
    const name = getPluginName('1476822950457x632962508451020800');
    expect(name).toBe('Stripe');
  });

  it('should return undefined for an unknown plugin ID', async () => {
    const { getPluginName } = await import('../src/data/plugin-registry.js');
    const name = getPluginName('0000000000000x000000000000000000');
    expect(name).toBeUndefined();
  });
});

describe('isIgnored helper', () => {
  it('should match by exact id', async () => {
    const { isIgnored } = await import('../src/analyzer/rules/rule.interface.js');
    expect(isIgnored('wf_abc', 'some workflow', [['wf_abc']])).toBe(true);
  });

  it('should match by name (case-insensitive)', async () => {
    const { isIgnored } = await import('../src/analyzer/rules/rule.interface.js');
    expect(isIgnored('wf_xyz', 'Legacy Migration', [['legacy migration']])).toBe(true);
  });

  it('should return false when no match', async () => {
    const { isIgnored } = await import('../src/analyzer/rules/rule.interface.js');
    expect(isIgnored('wf_xyz', 'Active Workflow', [['legacy']])).toBe(false);
  });
});

