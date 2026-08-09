/**
 * HTML reporter — generates standalone interactive visual graph explorer
 * Uses embedded Vis.js (no server required)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AnalysisResult } from '../analyzer/index.js';
import type { Finding } from '../analyzer/rules/rule.interface.js';

export function writeHtmlReport(
  result: AnalysisResult,
  outputDir: string,
): string {
  mkdirSync(outputDir, { recursive: true });

  const { app, findings, healthScore, graphStats } = result;

  // Build graph data for Vis.js
  const nodes = buildVisNodes(result);
  const edges = buildVisEdges(result);
  const findingsJson = JSON.stringify(findings, null, 2);
  const healthJson = JSON.stringify(healthScore, null, 2);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bubble.io Audit — ${app.meta.id}</title>
  <script src="https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js"></script>
  <link href="https://unpkg.com/vis-network@9.1.9/dist/dist/vis-network.min.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0a1e; color: #e2e8f0; }
    #header { background: linear-gradient(135deg, #1e0a3c, #2d1b69); padding: 20px 30px; border-bottom: 1px solid #4c1d95; }
    #header h1 { font-size: 22px; color: #a78bfa; }
    #header p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    #score-bar { display: flex; gap: 20px; padding: 16px 30px; background: #160d2e; border-bottom: 1px solid #2d1b69; flex-wrap: wrap; }
    .score-card { background: #1e1040; border-radius: 10px; padding: 12px 20px; border: 1px solid #4c1d95; }
    .score-card .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
    .score-card .value { font-size: 26px; font-weight: bold; margin-top: 4px; }
    .score-excellent { color: #4ade80; }
    .score-good { color: #facc15; }
    .score-fair { color: #fb923c; }
    .score-poor, .score-critical { color: #f87171; }
    #layout { display: flex; height: calc(100vh - 140px); }
    #graph-container { flex: 1; position: relative; }
    #mynetwork { width: 100%; height: 100%; }
    #sidebar { width: 380px; background: #160d2e; border-left: 1px solid #2d1b69; overflow-y: auto; padding: 16px; }
    #sidebar h2 { font-size: 14px; color: #a78bfa; margin-bottom: 12px; }
    .finding-card { background: #1e1040; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 3px solid #4c1d95; }
    .finding-card.error { border-left-color: #f87171; }
    .finding-card.warning { border-left-color: #facc15; }
    .finding-card.info { border-left-color: #60a5fa; }
    .finding-title { font-size: 12px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
    .finding-msg { font-size: 11px; color: #94a3b8; line-height: 1.4; }
    .finding-suggest { font-size: 10px; color: #6b7280; margin-top: 4px; font-style: italic; }
    .badge { display: inline-block; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-right: 4px; }
    .badge-high { background: #7f1d1d; color: #fca5a5; }
    .badge-medium { background: #713f12; color: #fcd34d; }
    .badge-low { background: #1e3a5f; color: #93c5fd; }
    #legend { position: absolute; bottom: 12px; left: 12px; background: rgba(15,10,30,0.9); border: 1px solid #2d1b69; border-radius: 8px; padding: 10px; font-size: 11px; }
    #legend div { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    #legend .dot { width: 10px; height: 10px; border-radius: 50%; }
    #filter-bar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .filter-btn { background: #2d1b69; border: 1px solid #4c1d95; color: #a78bfa; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; }
    .filter-btn:hover { background: #4c1d95; }
    .filter-btn.active { background: #7c3aed; border-color: #7c3aed; color: white; }
    #node-detail { background: #1e1040; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: none; border: 1px solid #4c1d95; }
    #node-detail h3 { font-size: 13px; color: #a78bfa; margin-bottom: 6px; }
    #node-detail p { font-size: 11px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
<div id="header">
  <h1>🫧 Bubble.io Dead Code Detector — Audit Report</h1>
  <p>App: <strong>${app.meta.id}</strong> · Version: ${app.meta.version} · Generated: ${result.timestamp.toLocaleString()}</p>
</div>

<div id="score-bar">
  <div class="score-card">
    <div class="label">Health Score</div>
    <div class="value score-${healthScore.grade}">${healthScore.emoji} ${healthScore.score}/100</div>
  </div>
  <div class="score-card">
    <div class="label">Total Issues</div>
    <div class="value" style="color:#e2e8f0">${findings.length}</div>
  </div>
  <div class="score-card">
    <div class="label">Errors</div>
    <div class="value score-poor">${healthScore.errorCount}</div>
  </div>
  <div class="score-card">
    <div class="label">Warnings</div>
    <div class="value score-good">${healthScore.warningCount}</div>
  </div>
  <div class="score-card">
    <div class="label">Graph Nodes</div>
    <div class="value" style="color:#a78bfa">${graphStats.totalNodes}</div>
  </div>
  <div class="score-card">
    <div class="label">Graph Edges</div>
    <div class="value" style="color:#818cf8">${graphStats.totalEdges}</div>
  </div>
</div>

<div id="layout">
  <div id="graph-container">
    <div id="mynetwork"></div>
    <div id="legend">
      <div><div class="dot" style="background:#7c3aed"></div> Page</div>
      <div><div class="dot" style="background:#2563eb"></div> Element</div>
      <div><div class="dot" style="background:#0891b2"></div> Workflow</div>
      <div><div class="dot" style="background:#059669"></div> Data Type</div>
      <div><div class="dot" style="background:#7c3aed;opacity:0.5"></div> Field</div>
      <div><div class="dot" style="background:#d97706"></div> Plugin</div>
      <div><div class="dot" style="background:#dc2626;border:2px solid #ef4444"></div> Dead/Orphan</div>
    </div>
  </div>
  <div id="sidebar">
    <div id="node-detail"></div>
    <h2>🔍 Findings (${findings.length})</h2>
    <div id="filter-bar">
      <button class="filter-btn active" onclick="filterFindings('all')">All</button>
      <button class="filter-btn" onclick="filterFindings('error')">Errors</button>
      <button class="filter-btn" onclick="filterFindings('warning')">Warnings</button>
      <button class="filter-btn" onclick="filterFindings('dead-code')">Dead Code</button>
      <button class="filter-btn" onclick="filterFindings('security')">Security</button>
    </div>
    <div id="findings-list">
      ${buildFindingsHtml(findings)}
    </div>
  </div>
</div>

<script>
const nodesData = ${JSON.stringify(nodes)};
const edgesData = ${JSON.stringify(edges)};
const findings = ${findingsJson};
const healthScore = ${healthJson};

// Init Vis.js network
const container = document.getElementById('mynetwork');
const data = { nodes: new vis.DataSet(nodesData), edges: new vis.DataSet(edgesData) };
const options = {
  nodes: { shape: 'dot', font: { color: '#e2e8f0', size: 11 }, borderWidth: 1 },
  edges: { color: { color: '#4c1d95', opacity: 0.5 }, arrows: { to: { enabled: true, scaleFactor: 0.5 } }, smooth: { type: 'continuous' } },
  physics: { stabilization: { iterations: 100 }, barnesHut: { gravitationalConstant: -3000, springLength: 120 } },
  interaction: { hover: true, tooltipDelay: 200 },
};
const network = new vis.Network(container, data, options);

network.on('selectNode', (params) => {
  if (params.nodes.length === 0) return;
  const nodeId = params.nodes[0];
  const node = nodesData.find(n => n.id === nodeId);
  if (!node) return;
  const detail = document.getElementById('node-detail');
  detail.style.display = 'block';
  detail.innerHTML = '<h3>' + node.label + '</h3><p>' +
    'Kind: <strong>' + (node.group || 'unknown') + '</strong><br>' +
    (node.title || '') + '</p>';
});

// Filter findings
function filterFindings(type) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const cards = document.querySelectorAll('.finding-card');
  cards.forEach(card => {
    if (type === 'all') { card.style.display = ''; return; }
    const matches = card.dataset.severity === type || card.dataset.category === type;
    card.style.display = matches ? '' : 'none';
  });
}
</script>
</body>
</html>`;

  const outputPath = join(outputDir, 'audit-report.html');
  writeFileSync(outputPath, html, 'utf-8');
  return outputPath;
}

// ─── Vis.js data builders ─────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  page: '#7c3aed',
  element: '#2563eb',
  workflow: '#0891b2',
  api_workflow: '#0e7490',
  data_type: '#059669',
  field: '#047857',
  option_set: '#d97706',
  style: '#9333ea',
  plugin: '#c2410c',
  reusable_element: '#7c3aed',
};

function buildVisNodes(result: AnalysisResult): unknown[] {
  const nodes: unknown[] = [];
  const deadIds = new Set(result.findings.map((f) => f.location.id));

  for (const node of result.graph.getAllNodes()) {
    const isDead = deadIds.has(node.id);
    const color = isDead ? '#dc2626' : (NODE_COLORS[node.kind] ?? '#64748b');
    const size = isDead ? 16 : getNodeSize(node.kind);

    nodes.push({
      id: node.id,
      label: truncateLabel(node.name),
      group: node.kind,
      color: { background: color, border: isDead ? '#ef4444' : darken(color), highlight: { background: '#f59e0b' } },
      size,
      title: buildNodeTooltip(node, isDead),
    });
  }

  return nodes;
}

function buildVisEdges(result: AnalysisResult): unknown[] {
  // We need to export edges from the graph — add a method for this
  // For now, collect from findings impactedBy
  return [];
}

function buildFindingsHtml(findings: Finding[]): string {
  if (findings.length === 0) return '<p style="color:#6b7280;font-size:12px">✅ No issues found!</p>';

  return findings
    .map((f) => {
      const badge =
        f.confidence === 'HIGH'
          ? '<span class="badge badge-high">HIGH</span>'
          : f.confidence === 'MEDIUM'
            ? '<span class="badge badge-medium">MED</span>'
            : '<span class="badge badge-low">LOW</span>';

      return `<div class="finding-card ${f.severity}" data-severity="${f.severity}" data-category="${f.category}">
        <div class="finding-title">${badge}${escapeHtml(f.ruleName)}</div>
        <div class="finding-msg">${escapeHtml(f.message)}</div>
        <div class="finding-suggest">💡 ${escapeHtml(f.suggestion)}</div>
      </div>`;
    })
    .join('');
}

function buildNodeTooltip(node: { name: string; kind: string; metadata: Record<string, unknown> }, isDead: boolean): string {
  let tooltip = `<strong>${node.name}</strong><br>Kind: ${node.kind}`;
  if (isDead) tooltip += '<br><span style="color:#ef4444">⚠ Dead / Orphaned</span>';
  return tooltip;
}

function getNodeSize(kind: string): number {
  const sizes: Record<string, number> = {
    page: 20,
    reusable_element: 18,
    data_type: 18,
    workflow: 12,
    api_workflow: 12,
    element: 8,
    field: 6,
    option_set: 10,
    style: 6,
    plugin: 14,
  };
  return sizes[kind] ?? 10;
}

function truncateLabel(name: string): string {
  return name.length > 25 ? name.slice(0, 23) + '…' : name;
}

function darken(hex: string): string {
  return hex; // simplified — could implement proper darkening
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
