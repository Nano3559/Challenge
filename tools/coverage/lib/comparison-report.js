'use strict';

function buildSummaryMarkdown(comparison, artifactUrl) {
  const code = comparison.codeCoverage;
  const rows = ['| Metric | Base | PR | Delta |', '|---|---:|---:|---:|'];
  for (const [label, key] of [['Line coverage', 'lines'], ['Branch coverage', 'branches'], ['Function coverage', 'functions'], ['Statement coverage', 'statements']]) {
    const before = code.base[key];
    const after = code.head[key];
    rows.push(`| ${label} | ${fmtMetric(before)} | ${fmtMetric(after)} | ${fmtDelta(code.delta[key])} |`);
  }
  rows.push(`| OpenAPI contract overall | ${fmtPct(comparison.apiCoverage.base?.global)} | ${fmtPct(comparison.apiCoverage.head?.global)} | ${fmtDelta(comparison.apiCoverage.delta)} |`);

  const status = comparison.measurement.status === 'available' ? 'Comparison generated' : `Measurement failed: ${comparison.measurement.reason}`;
  const runLine = `Base test run: **${comparison.measurement.baseRun}** · PR test run: **${comparison.measurement.headRun}**`;
  const unavailable = code.available ? '' : `\n\n> Code coverage is unavailable. ${code.reason} It is not reported as 0%.`;
  const gaps = comparison.apiCoverage.topGaps.length
    ? comparison.apiCoverage.topGaps.map((gap, i) => `${i + 1}. \`${gap.method} ${gap.endpoint}\` — ${gap.description}`).join('\n')
    : 'No comparable API gap list was available.';
  const regressions = code.regressions.slice(0, 5).map((file) => `- \`${file.path}\`: ${fmtPct(file.base?.lines.pct)} → ${fmtPct(file.head?.lines.pct)} (${fmtDelta(file.delta)})`).join('\n') || '- No measured file regressions.';
  const uncovered = code.uncoveredFiles.slice(0, 5).map((file) => `- \`${file.path}\`: ${fmtPct(file.head.lines.pct)} (${file.head.lines.total - file.head.lines.covered} uncovered lines)`).join('\n') || '- No measured uncovered files.';
  const resolved = comparison.apiCoverage.resolvedGaps.length ? comparison.apiCoverage.resolvedGaps.map((id) => `- \`${id}\``).join('\n') : '- None.';
  const introduced = comparison.apiCoverage.introducedGaps.length ? comparison.apiCoverage.introducedGaps.map((id) => `- \`${id}\``).join('\n') : '- None.';

  return [
    '## Coverage comparison', '', `**Status:** ${status}`, '', runLine, '', rows.join('\n'), unavailable,
    '', `Uncovered files: **${code.available ? code.uncoveredFiles.length : 'unavailable'}**`, '', '### Top 5 coverage gaps', gaps,
    '', '### Largest file coverage regressions', regressions, '', '### Lowest-covered files', uncovered,
    '', '### Newly introduced API gaps', introduced, '', '### API gaps resolved vs base', resolved,
    '', '### Measurement scope',
    'Code metrics cover Node.js files included by c8 in the API test run. Browser-only frontend execution is not instrumented. API contract coverage is reported separately by the repository OpenAPI analyzer.',
    artifactUrl ? `\n\n[Download the HTML comparison artifact](${artifactUrl})` : '\n\nArtifact: `api-coverage-comparison` (attached to this workflow run).', '',
  ].join('\n');
}

function buildHtml(comparison, artifactUrl) {
  const code = comparison.codeCoverage;
  chartRow.index = 36;
  const chart = [['Lines', 'lines'], ['Branches', 'branches'], ['Functions', 'functions'], ['Statements', 'statements']]
    .map(([label, key]) => chartRow(label, code.base[key]?.pct, code.head[key]?.pct)).join('');
  const fileRows = code.files.map((file) => `<tr><td><code>${escapeHtml(file.path)}</code></td><td>${fmtPct(file.base?.lines.pct)}</td><td>${fmtPct(file.head?.lines.pct)}</td><td>${fmtDelta(file.delta)}</td><td>${escapeHtml(file.newlyCoveredLines.join(', ') || '—')}</td><td>${escapeHtml(file.newlyUncoveredLines.join(', ') || '—')}</td></tr>`).join('');
  const functions = code.files.flatMap((file) => file.uncoveredFunctions.map((name) => `<li><code>${escapeHtml(file.path)} :: ${escapeHtml(name)}</code></li>`)).slice(0, 50).join('') || '<li>Unavailable or none.</li>';
  const branches = code.files.flatMap((file) => file.uncoveredBranches.map((branch) => `<li><code>${escapeHtml(file.path)}:${branch.line}</code> (${escapeHtml(branch.id)})</li>`)).slice(0, 50).join('') || '<li>Unavailable or none.</li>';
  const gaps = comparison.apiCoverage.topGaps.map((gap) => `<li><code>${escapeHtml(gap.method)} ${escapeHtml(gap.endpoint)}</code> — ${escapeHtml(gap.description)}</li>`).join('') || '<li>Unavailable.</li>';
  const regressions = code.regressions.slice(0, 10).map((file) => `<li><code>${escapeHtml(file.path)}</code> ${fmtPct(file.base?.lines.pct)} → ${fmtPct(file.head?.lines.pct)} (${fmtDelta(file.delta)})</li>`).join('') || '<li>None measured.</li>';
  const newCovered = code.newlyCoveredLines.slice(0, 200).map((line) => `<li><code>${escapeHtml(line.file)}:${line.line}</code></li>`).join('') || '<li>None measured.</li>';
  const newUncovered = code.newlyUncoveredLines.slice(0, 200).map((line) => `<li><code>${escapeHtml(line.file)}:${line.line}</code></li>`).join('') || '<li>None measured.</li>';
  const apiBase = comparison.apiCoverage.base;
  const apiHead = comparison.apiCoverage.head;
  const status = comparison.measurement.status === 'available' ? 'Available' : `Failed: ${comparison.measurement.reason}`;
  const artifact = artifactUrl ? `<a href="${escapeHtml(artifactUrl)}">Workflow artifact</a>` : 'Download this report from the workflow artifact named api-coverage-comparison.';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Coverage comparison</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;margin:2rem auto;padding:0 1rem;max-width:1200px;color:#17212b;background:#f7f9fb}h1,h2{line-height:1.2}section,.card{background:white;border:1px solid #d9e1e8;border-radius:10px;padding:1rem 1.25rem;margin:1rem 0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem}.card strong{font-size:1.6rem;display:block}.muted{color:#586773}.ok{color:#167544}.bad{color:#a32323}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;border-bottom:1px solid #e4e9ee;padding:.55rem;vertical-align:top}th{background:#eef3f7}code{overflow-wrap:anywhere}svg{width:100%;height:auto}.bar{fill:#1976d2}.bar.base{fill:#90a4ae}.legend{font-size:12px}details{margin:.5rem 0}
</style></head><body>
<h1>Coverage comparison</h1><p class="${comparison.measurement.status === 'available' ? 'ok' : 'bad'}"><strong>Measurement:</strong> ${escapeHtml(status)} · Base run: ${escapeHtml(comparison.measurement.baseRun)} · PR run: ${escapeHtml(comparison.measurement.headRun)}</p>
<div class="cards"><div class="card"><span>Code coverage</span><strong>${code.available ? fmtPct(code.head.statements.pct) : 'Unavailable'}</strong><span class="muted">Statement coverage · delta ${fmtDelta(code.delta.statements)}</span></div><div class="card"><span>OpenAPI contract</span><strong>${fmtPct(apiHead?.global)}</strong><span class="muted">Base ${fmtPct(apiBase?.global)} · delta ${fmtDelta(comparison.apiCoverage.delta)}</span></div><div class="card"><span>Coverage gaps</span><strong>${comparison.apiCoverage.head ? comparison.apiCoverage.head.endpoints.uncovered + comparison.apiCoverage.head.operations.uncovered + comparison.apiCoverage.head.statuses.uncovered + comparison.apiCoverage.head.parameters.uncovered : 'Unavailable'}</strong><span class="muted">OpenAPI endpoints, operations, statuses, and parameters</span></div></div>
<section><h2>Code coverage metrics</h2>${code.available ? `<table><thead><tr><th>Metric</th><th>Base</th><th>PR</th><th>Delta</th></tr></thead><tbody>${metricTableRows(code)}</tbody></table><p class="muted">Line/function/branch data comes from c8. ${artifact}</p>` : `<p class="bad">Not available; missing metrics are not shown as 0%. ${escapeHtml(code.reason)}</p>`}</section>
<section><h2>Coverage chart</h2>${code.available ? `<svg viewBox="0 0 760 230" role="img" aria-label="Base and pull request code coverage comparison"><text x="650" y="18" class="legend">Base</text><rect x="615" y="7" width="12" height="12" class="bar base"/><text x="730" y="18" class="legend">PR</text><rect x="700" y="7" width="12" height="12" class="bar"/>${chart}</svg>` : '<p class="muted">Chart unavailable because code coverage data is missing.</p>'}</section>
<section><h2>OpenAPI contract coverage</h2><table><thead><tr><th>Metric</th><th>Base</th><th>PR</th><th>Delta</th></tr></thead><tbody><tr><td>Overall</td><td>${fmtPct(apiBase?.global)}</td><td>${fmtPct(apiHead?.global)}</td><td>${fmtDelta(comparison.apiCoverage.delta)}</td></tr><tr><td>Endpoints</td><td>${fmtCount(apiBase?.endpoints)}</td><td>${fmtCount(apiHead?.endpoints)}</td><td>—</td></tr><tr><td>Operations</td><td>${fmtCount(apiBase?.operations)}</td><td>${fmtCount(apiHead?.operations)}</td><td>—</td></tr><tr><td>Status codes</td><td>${fmtCount(apiBase?.statuses)}</td><td>${fmtCount(apiHead?.statuses)}</td><td>—</td></tr><tr><td>Parameters</td><td>${fmtCount(apiBase?.parameters)}</td><td>${fmtCount(apiHead?.parameters)}</td><td>—</td></tr></tbody></table></section>
<section><h2>Coverage by file</h2><p class="muted">Newly covered and uncovered line numbers are relative to the same normalized file path in the base and PR reports.</p><table><thead><tr><th>File</th><th>Base lines</th><th>PR lines</th><th>Delta</th><th>Newly covered lines</th><th>Newly uncovered lines</th></tr></thead><tbody>${fileRows || '<tr><td colspan="6">File coverage unavailable.</td></tr>'}</tbody></table></section>
<section><h2>Largest file coverage regressions</h2><ul>${regressions}</ul></section><section><h2>Top 5 OpenAPI coverage gaps</h2><ol>${gaps}</ol></section>
<section><h2>Uncovered functions</h2><ul>${functions}</ul></section><section><h2>Uncovered branches</h2><ul>${branches}</ul></section>
<section><h2>Newly covered lines</h2><ul>${newCovered}</ul></section><section><h2>Newly uncovered lines</h2><ul>${newUncovered}</ul></section>
<section><h2>Scope and availability</h2><p>Code coverage includes Node.js files selected by c8 during API tests. Browser-only frontend execution is not instrumented. OpenAPI contract coverage is independent and does not imply line or branch coverage.</p><p>${artifact}</p></section>
</body></html>`;
}

function metricTableRows(code) {
  return [['Line', 'lines'], ['Branch', 'branches'], ['Function', 'functions'], ['Statement', 'statements']].map(([name, key]) => `<tr><td>${name}</td><td>${fmtMetric(code.base[key])}</td><td>${fmtMetric(code.head[key])}</td><td>${fmtDelta(code.delta[key])}</td></tr>`).join('');
}

function chartRow(label, base, head) {
  const y = chartRow.index || 36;
  chartRow.index = y + 48;
  return `<text x="0" y="${y + 19}" class="legend">${label}</text><rect x="115" y="${y}" width="${Math.max(0, Math.min(100, base || 0)) * 5.8}" height="13" class="bar base"/><rect x="115" y="${y + 17}" width="${Math.max(0, Math.min(100, head || 0)) * 5.8}" height="13" class="bar"/><text x="710" y="${y + 12}" class="legend">${fmtPct(base)}</text><text x="710" y="${y + 29}" class="legend">${fmtPct(head)}</text>`;
}
chartRow.index = 36;

function fmtPct(value) { return Number.isFinite(value) ? `${value.toFixed(2)}%` : 'Unavailable'; }
function fmtDelta(value) { return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)} pp` : 'Unavailable'; }
function fmtMetric(metric) { return metric ? `${fmtPct(metric.pct)} (${metric.covered}/${metric.total})` : 'Unavailable'; }
function fmtCount(metric) { return metric && Number.isFinite(metric.percentage) ? `${metric.covered}/${metric.total} (${metric.percentage.toFixed(2)}%)` : metric ? `${metric.covered}/${metric.total}` : 'Unavailable'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }

module.exports = { buildSummaryMarkdown, buildHtml };
