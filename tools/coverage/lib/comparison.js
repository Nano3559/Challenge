'use strict';

const METRICS = ['lines', 'branches', 'functions', 'statements'];

function buildComparison({ base, head, baseGaps, headGaps, baseLcov, headLcov, runStatus = {} }) {
  const baseCode = codeCoverage(base?.codeSummary);
  const headCode = codeCoverage(head?.codeSummary);
  const codeAvailable = baseCode.available && headCode.available;
  const files = compareFiles(parseLcov(baseLcov), parseLcov(headLcov));
  const baseGapList = Array.isArray(baseGaps?.gaps) ? baseGaps.gaps : null;
  const headGapList = Array.isArray(headGaps?.gaps) ? headGaps.gaps : null;
  const gapIds = (list) => new Set((list || []).map((gap) => gap.id || gapKey(gap)));
  const baseIds = gapIds(baseGapList);
  const headIds = gapIds(headGapList);

  const apiBase = apiCoverage(base?.report);
  const apiHead = apiCoverage(head?.report);
  const apiAvailable = apiBase !== null && apiHead !== null;

  const failedRuns = ['base', 'head'].filter((target) => runStatus[target] && runStatus[target] !== 'passed');
  const measurementReason = !apiAvailable
    ? 'Falta coverage-report.json del branch base o PR; no se sustituyó por 0%.'
    : failedRuns.length
      ? `Falló la validación o ejecución de tests en: ${failedRuns.join(', ')}.`
      : null;

  return {
    generatedAt: new Date().toISOString(),
    measurement: {
      status: measurementReason ? 'failed' : 'available',
      reason: measurementReason,
      baseRun: runStatus.base || 'unknown',
      headRun: runStatus.head || 'unknown',
    },
    codeCoverage: {
      available: codeAvailable,
      reason: codeAvailable ? null : 'Falta coverage-summary.json de c8 para ambos branches; las métricas de código quedan no disponibles.',
      base: baseCode.metrics,
      head: headCode.metrics,
      delta: Object.fromEntries(METRICS.map((metric) => [metric, delta(headCode.metrics[metric], baseCode.metrics[metric])])),
      files,
      newlyCoveredLines: files.flatMap((file) => file.newlyCoveredLines.map((line) => ({ file: file.path, line }))),
      newlyUncoveredLines: files.flatMap((file) => file.newlyUncoveredLines.map((line) => ({ file: file.path, line }))),
      uncoveredFiles: files.filter((file) => file.head && file.head.lines.pct < 100).sort((a, b) => a.head.lines.pct - b.head.lines.pct),
      regressions: files.filter((file) => file.delta !== null && file.delta < 0).sort((a, b) => a.delta - b.delta),
    },
    apiCoverage: {
      available: apiAvailable,
      reason: apiAvailable ? null : 'Falta el reporte de cobertura OpenAPI de uno de los branches.',
      base: apiBase,
      head: apiHead,
      delta: apiAvailable ? round(apiHead.global - apiBase.global) : null,
      resolvedGaps: baseGapList && headGapList ? [...baseIds].filter((id) => !headIds.has(id)) : [],
      introducedGaps: baseGapList && headGapList ? [...headIds].filter((id) => !baseIds.has(id)) : [],
      topGaps: headGapList ? headGapList.slice(0, 5) : [],
      criticalGaps: Number.isFinite(Number(headGaps?.summary?.critical)) ? Number(headGaps.summary.critical) : null,
      byRoute: apiAvailable ? compareRoutes(base.report, head.report) : [],
    },
  };
}

function codeCoverage(summary) {
  const total = summary?.total;
  const metrics = Object.fromEntries(METRICS.map((metric) => [metric, metricCoverage(total?.[metric])]));
  const available = METRICS.every((metric) => metrics[metric] !== null);
  return { available, metrics };
}

function metricCoverage(value) {
  if (!value || !Number.isFinite(Number(value.pct))) return null;
  return { total: Number(value.total), covered: Number(value.covered), pct: round(Number(value.pct)) };
}

function apiCoverage(report) {
  const summary = report?.summary;
  if (!summary?.global || !Number.isFinite(Number(summary.global.percentage))) return null;
  return {
    global: round(Number(summary.global.percentage)),
    endpoints: summary.endpoints,
    operations: summary.operations,
    statuses: summary.statusCodes,
    parameters: summary.parameters,
  };
}

function compareRoutes(baseReport, headReport) {
  const routeMap = (report) => {
    const result = new Map();
    for (const endpoint of report?.endpoints || []) {
      const operations = endpoint.operations || [];
      let total = 0;
      let covered = 0;
      for (const operation of operations) {
        total += 1;
        if (operation.covered) covered += 1;
        for (const status of operation.statusCodes || []) { total += 1; if (status.covered) covered += 1; }
        for (const parameter of operation.parameters || []) { total += 1; if (parameter.covered) covered += 1; }
      }
      result.set(endpoint.path, total ? round((covered / total) * 100) : null);
    }
    return result;
  };
  const base = routeMap(baseReport);
  const head = routeMap(headReport);
  return [...new Set([...base.keys(), ...head.keys()])].map((path) => ({
    path, base: base.get(path) ?? null, head: head.get(path) ?? null,
    delta: base.has(path) && head.has(path) ? round(head.get(path) - base.get(path)) : null,
  })).filter((route) => route.delta !== null && route.delta !== 0).sort((a, b) => a.delta - b.delta);
}

function parseLcov(text) {
  const files = new Map();
  if (typeof text !== 'string' || !text.trim()) return files;
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const [key, ...rest] = raw.split(':');
    const value = rest.join(':');
    if (key === 'SF') {
      current = { path: normalizeFile(value), lines: new Map(), functions: new Map(), branches: new Map() };
      files.set(current.path, current);
    } else if (current && key === 'DA') {
      const [line, hits] = value.split(',');
      current.lines.set(Number(line), Number(hits));
    } else if (current && key === 'FN') {
      const comma = value.indexOf(',');
      current.functions.set(value.slice(comma + 1), { line: Number(value.slice(0, comma)), hits: 0 });
    } else if (current && key === 'FNDA') {
      const comma = value.indexOf(',');
      const fn = current.functions.get(value.slice(comma + 1));
      if (fn) fn.hits = Number(value.slice(0, comma));
    } else if (current && key === 'BRDA') {
      const [line, block, branch, taken] = value.split(',');
      current.branches.set(`${line}:${block}:${branch}`, { line: Number(line), hits: taken === '-' ? null : Number(taken) });
    } else if (key === 'end_of_record') current = null;
  }
  return files;
}

function compareFiles(baseFiles, headFiles) {
  const paths = new Set([...baseFiles.keys(), ...headFiles.keys()]);
  return [...paths].map((path) => {
    const base = summarizeFile(baseFiles.get(path));
    const head = summarizeFile(headFiles.get(path));
    const baseLines = baseFiles.get(path)?.lines || new Map();
    const headLines = headFiles.get(path)?.lines || new Map();
    const newlyCoveredLines = [...headLines.keys()].filter((line) => (baseLines.get(line) || 0) === 0 && (headLines.get(line) || 0) > 0).sort((a, b) => a - b);
    const newlyUncoveredLines = [...headLines.keys()].filter((line) => (baseLines.get(line) || 0) > 0 && (headLines.get(line) || 0) === 0).sort((a, b) => a - b);
    return {
      path,
      base,
      head,
      delta: base && head ? round(head.lines.pct - base.lines.pct) : null,
      newlyCoveredLines,
      newlyUncoveredLines,
      uncoveredFunctions: headFiles.get(path) ? [...headFiles.get(path).functions.entries()].filter(([, fn]) => fn.hits === 0).map(([name]) => name) : [],
      uncoveredBranches: headFiles.get(path) ? [...headFiles.get(path).branches.entries()].filter(([, branch]) => branch.hits === 0).map(([id, branch]) => ({ id, line: branch.line })) : [],
    };
  }).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
}

function summarizeFile(file) {
  if (!file) return null;
  const total = file.lines.size;
  const covered = [...file.lines.values()].filter((hits) => hits > 0).length;
  return { lines: { total, covered, pct: total ? round((covered / total) * 100) : null } };
}

function normalizeFile(path) {
  const normalized = path.replace(/\\/g, '/');
  for (const marker of ['/gad-gui-api-demo/', '/src/']) {
    const index = normalized.lastIndexOf(marker);
    if (index >= 0) return normalized.slice(index + 1);
  }
  return normalized.replace(/^.*?\/(?:home|runner|work)\//, '');
}

function gapKey(gap) {
  return [gap.method, gap.endpoint, gap.statusCode || gap.parameterIn, gap.statusCode ? '' : gap.parameter].join('|');
}

function delta(head, base) {
  return head && base ? round(head.pct - base.pct) : null;
}

function round(value) { return Math.round(value * 100) / 100; }

module.exports = { buildComparison, parseLcov, compareFiles, normalizeFile };
