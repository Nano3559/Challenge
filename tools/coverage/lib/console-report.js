'use strict';

/**
 * Reporte legible por humanos. El detalle completo queda en los JSON;
 * aquí se muestra un resumen y las brechas más relevantes para no inundar
 * la consola con cientos de líneas.
 */
function printConsoleReport(report, gapReport, { limit = 10 } = {}) {
  const line = '='.repeat(78);
  const { summary } = report;

  console.log('');
  console.log(line);
  console.log(' OpenAPI Coverage Report');
  console.log(line);
  console.log(`Spec        : ${report.spec.source}`);
  console.log(`OpenAPI     : ${report.spec.openapi}${report.spec.title ? ` (${report.spec.title} ${report.spec.version || ''})`.trimEnd() : ''}`);
  console.log(`Servers     : ${report.spec.servers.map((server) => server.url).join(', ')}`);
  console.log(`Requests    : ${summary.requests.total} grabadas | ${summary.requests.matched} matcheadas | ${summary.requests.unmatched} sin match`);
  console.log(`Request dir : ${report.requests.source}`);
  console.log('');

  printMetric('Endpoints', summary.endpoints, 'covered', 'total');
  console.log(
    `              full: ${summary.endpoints.fullyCovered} | partial: ${summary.endpoints.partiallyCovered} | sin cobertura: ${summary.endpoints.uncovered}`,
  );
  printMetric('Operaciones', summary.operations, 'covered', 'total');
  printMetric('Status codes', summary.statusCodes, 'covered', 'total');
  printMetric('Parámetros', summary.parameters, 'covered', 'total');
  console.log('');
  console.log(
    `GLOBAL (${summary.global.formula}): ${summary.global.coveredUnits}/${summary.global.totalUnits} = ${formatPct(summary.global.percentage)}`,
  );
  console.log('');

  const byCategory = gapReport.summary.byCategory;
  const categoryLine = Object.entries(byCategory)
    .map(([category, count]) => `${category}=${count}`)
    .join(' | ');
  console.log(`Brechas     : ${gapReport.summary.total} (críticas: ${gapReport.summary.critical})`);
  if (categoryLine) console.log(`              ${categoryLine}`);
  console.log('');

  const topGaps = gapReport.gaps.slice(0, limit);
  if (topGaps.length > 0) {
    console.log(`Principales brechas (${topGaps.length} de ${gapReport.gaps.length}):`);
    for (const gap of topGaps) {
      const coordinate = `${gap.method} ${gap.endpoint}`;
      const extra = gap.statusCode ? ` status=${gap.statusCode}` : gap.parameter ? ` ${gap.parameterIn}:${gap.parameter}` : '';
      console.log(`  [${gap.severity.toUpperCase().padEnd(8)}] ${coordinate}${extra}`);
      console.log(`             ${gap.description}`);
    }
    const remaining = gapReport.gaps.length - topGaps.length;
    if (remaining > 0) console.log(`  ... y ${remaining} brechas más (ver coverage-gaps.json)`);
  } else {
    console.log('No se detectaron brechas.');
  }

  if (report.unmatchedRequests.length > 0) {
    console.log('');
    console.log(`Solicitudes sin match (${report.unmatchedRequests.length}):`);
    for (const request of report.unmatchedRequests.slice(0, 5)) {
      console.log(`  ${request.method} ${request.path} -> ${request.status ?? 'sin status'}`);
    }
    if (report.unmatchedRequests.length > 5) {
      console.log(`  ... y ${report.unmatchedRequests.length - 5} más (ver coverage-report.json)`);
    }
  }

  console.log('');
  console.log(line);
  console.log('');
}

function printMetric(label, metric, coveredKey, totalKey) {
  console.log(
    `${label.padEnd(12)}: ${String(metric[coveredKey]).padStart(4)}/${String(metric[totalKey]).padEnd(4)} = ${formatPct(metric.percentage)}`,
  );
}

function formatPct(value) {
  return `${Number(value).toFixed(2)}%`;
}

module.exports = { printConsoleReport };
