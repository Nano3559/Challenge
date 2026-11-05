'use strict';

const path = require('path');

/**
 * Genera day-1-baseline.md a partir del reporte real de la herramienta,
 * las brechas reales y las estimaciones de IA efectivamente ejecutadas.
 * Si no hay estimaciones, lo dice explícitamente: nunca rellena números.
 */
function buildBaselineMarkdown({ report, gapReport, aiEstimates, aiComparison, inputs = {} }) {
  const summary = report.summary;
  const generatedAt = report.generatedAt;
  const toolCoverage = summary.global.percentage;
  const lines = [];

  lines.push('# Day 1 Baseline — Cobertura de pruebas automatizadas vs OpenAPI');
  lines.push('');
  lines.push(`Generado: ${generatedAt}`);
  lines.push('');
  lines.push('> Documento generado por la herramienta `coverage-cli`. Los números de la sección "Herramienta"');
  lines.push('> provienen de la ejecución real sobre la especificación y las solicitudes grabadas. Los números de');
  lines.push('> IA provienen de estimaciones ejecutadas aparte y registradas en el archivo indicado; si no se');
  lines.push('> ejecutaron, se indica explícitamente y no se reemplazan por valores inventados.');
  lines.push('');

  lines.push('## 1. Objetivo del análisis');
  lines.push('');
  lines.push(
    'Medir qué parte de la API documentada en el OpenAPI está realmente cubierta por las pruebas automatizadas,',
  );
  lines.push(
    'entendiendo "cubierta" como algo más que "se ejecutó una solicitud": se miden también métodos, códigos de',
  );
  lines.push('estado documentados y parámetros ejercitados. El resultado sirve como línea base para priorizar pruebas.');
  lines.push('');

  lines.push('## 2. Archivos analizados');
  lines.push('');
  lines.push('| Elemento | Ruta / detalle |');
  lines.push('|---|---|');
  lines.push(`| Especificación OpenAPI | \`${relativeForDisplay(report.spec.source)}\` (OpenAPI ${report.spec.openapi}) |`);
  lines.push(`| Título / versión | ${report.spec.title || 'no informado'} / ${report.spec.version || 'no informada'} |`);
  lines.push(`| Servidores | ${report.spec.servers.map((server) => `\`${server.url}\``).join(', ')} |`);
  lines.push(`| Prefijos normalizados | ${report.spec.basePaths.map((prefix) => `\`${prefix || '(vacío)'}\``).join(', ')} |`);
  lines.push(`| Solicitudes grabadas | \`${relativeForDisplay(report.requests.source)}\` (${report.requests.files.length} archivo(s)) |`);
  lines.push(`| Solicitudes | ${summary.requests.total} total, ${summary.requests.matched} matcheadas, ${summary.requests.unmatched} sin match |`);
  lines.push(`| Pruebas analizadas | \`${inputs.testsPath || 'tests/'}\` (referencia; el análisis usa las solicitudes grabadas) |`);
  lines.push(`| Ejecución | \`${inputs.command || 'no informado'}\` |`);
  lines.push('');

  lines.push('### Modelo de medición');
  lines.push('');
  lines.push(`- Unidades globales: ${report.coverageModel.units}.`);
  lines.push(`- Fórmula global: ${report.coverageModel.globalFormula}.`);
  lines.push(`- Endpoints: ${report.coverageModel.endpointCoverage}.`);
  lines.push(`- "Full": ${report.coverageModel.fullEndpointDefinition}.`);
  lines.push(`- Parámetros: ${report.coverageModel.parameterCoverage}.`);
  lines.push(`- Status codes: ${report.coverageModel.statusCodeCoverage}.`);
  lines.push('');

  lines.push('## 3. Cobertura calculada por la herramienta');
  lines.push('');
  lines.push('| Dimensión | Cubierto | Total | Cobertura |');
  lines.push('|---|---:|---:|---:|');
  lines.push(
    `| Endpoints | ${summary.endpoints.covered} | ${summary.endpoints.total} | ${formatPct(summary.endpoints.percentage)} |`,
  );
  lines.push(
    `| Operaciones (método + path) | ${summary.operations.covered} | ${summary.operations.total} | ${formatPct(summary.operations.percentage)} |`,
  );
  lines.push(
    `| Códigos de estado documentados | ${summary.statusCodes.covered} | ${summary.statusCodes.total} | ${formatPct(summary.statusCodes.percentage)} |`,
  );
  lines.push(
    `| Parámetros documentados | ${summary.parameters.covered} | ${summary.parameters.total} | ${formatPct(summary.parameters.percentage)} |`,
  );
  lines.push(
    `| **Global ponderado** | **${summary.global.coveredUnits}** | **${summary.global.totalUnits}** | **${formatPct(toolCoverage)}** |`,
  );
  lines.push('');
  lines.push(
    `Endpoints por estado: ${summary.endpoints.fullyCovered} completos, ${summary.endpoints.partiallyCovered} parciales y ${summary.endpoints.uncovered} sin cobertura.`,
  );
  lines.push('');

  lines.push('## 4. Primera estimación de IA');
  lines.push('');
  lines.push(...renderEstimate(aiEstimates, 0));
  lines.push('');

  lines.push('## 5. Segunda estimación de IA');
  lines.push('');
  lines.push(...renderEstimate(aiEstimates, 1));
  lines.push('');

  lines.push('## 6. Variación entre ambas estimaciones');
  lines.push('');
  if (!aiComparison || aiComparison.variationBetweenEstimates === null) {
    lines.push('No hay dos estimaciones reales disponibles; por lo tanto no se calcula variación.');
  } else {
    lines.push(
      `Variación absoluta: **${aiComparison.variationBetweenEstimates.toFixed(2)} puntos porcentuales**.`,
    );
    lines.push('');
    lines.push(
      aiComparison.variationBetweenEstimates <= 5
        ? 'Las dos estimaciones son consistentes entre sí (≤ 5 pp).'
        : aiComparison.variationBetweenEstimates <= 15
          ? 'Las dos estimaciones tienen una divergencia moderada (> 5 pp y ≤ 15 pp); conviene revisar los criterios usados.'
          : 'Las dos estimaciones divergen de forma alta (> 15 pp); no deberían usarse como métrica única.',
    );
  }
  lines.push('');

  lines.push('## 7. Comparación entre IA y herramienta');
  lines.push('');
  if (!aiComparison) {
    lines.push(
      'No se ejecutó una estimación real de IA, así que no existe comparación. No se presentan valores simulados.',
    );
    if (aiEstimates && aiEstimates.reason) lines.push('', `Motivo: ${aiEstimates.reason}`);
  } else {
    lines.push('| Fuente | Cobertura global estimada/medida | Diferencia vs herramienta |');
    lines.push('|---|---:|---:|');
    lines.push(`| Herramienta (real) | ${formatPct(aiComparison.toolCoverage)} | 0.00 pp |`);
    for (const estimate of aiComparison.estimates) {
      lines.push(
        `| IA ${estimate.id} | ${formatPct(estimate.estimatedCoverage)} | ${formatSigned(estimate.differenceVsTool)} pp |`,
      );
    }
    lines.push('');
    lines.push(
      'La diferencia se expresa en puntos porcentuales (estimación IA − herramienta). Una diferencia positiva',
    );
    lines.push('indica que la IA sobreestimó la cobertura; una negativa, que la subestimó.');
    lines.push('');
    lines.push(
      'Las estimaciones de IA son juicios sobre el código y la especificación: no reemplazan la evidencia de',
    );
    lines.push('solicitudes grabadas. La herramienta es la fuente de verdad para esta línea base.');
  }
  lines.push('');

  lines.push('## 8. Principales brechas identificadas');
  lines.push('');
  lines.push(`Total de brechas: **${gapReport.summary.total}** (críticas: ${gapReport.summary.critical}).`);
  lines.push('');
  lines.push('| Categoría | Cantidad | Severidad típica |');
  lines.push('|---|---:|---|');
  for (const [category, count] of Object.entries(gapReport.summary.byCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${category}\` | ${count} | ${severityForCategory(category)} |`);
  }
  lines.push('');
  if (gapReport.gaps.length > 0) {
    lines.push('Brechas prioritarias (máximo 15):');
    lines.push('');
    for (const gap of gapReport.gaps.slice(0, 15)) {
      const extra = gap.statusCode
        ? ` — status ${gap.statusCode}`
        : gap.parameter
          ? ` — ${gap.parameterIn}:${gap.parameter}`
          : '';
      lines.push(`- **[${gap.severity}]** \`${gap.method} ${gap.endpoint}\`${extra}: ${gap.description}`);
    }
    if (gapReport.gaps.length > 15) {
      lines.push(`- ... y ${gapReport.gaps.length - 15} brechas más en \`coverage-gaps.json\`.`);
    }
  } else {
    lines.push('No se detectaron brechas con el modelo de medición actual.');
  }
  lines.push('');

  lines.push('## 9. Conclusiones y recomendaciones');
  lines.push('');
  lines.push(`- Cobertura global medida: **${formatPct(toolCoverage)}** (${summary.global.coveredUnits}/${summary.global.totalUnits} unidades).`);
  lines.push(`- Endpoints con al menos una solicitud: **${summary.endpoints.covered}/${summary.endpoints.total}** (${formatPct(summary.endpoints.percentage)}).`);
  lines.push(`- Operaciones ejercitadas: **${summary.operations.covered}/${summary.operations.total}** (${formatPct(summary.operations.percentage)}).`);
  lines.push(`- Códigos de estado verificados: **${summary.statusCodes.covered}/${summary.statusCodes.total}** (${formatPct(summary.statusCodes.percentage)}).`);
  lines.push(`- Parámetros ejercitados: **${summary.parameters.covered}/${summary.parameters.total}** (${formatPct(summary.parameters.percentage)}).`);
  lines.push('');
  lines.push('Recomendaciones basadas en los datos anteriores:');
  lines.push('');
  if (summary.endpoints.uncovered > 0) {
    lines.push(
      `1. Priorizar los ${summary.endpoints.uncovered} endpoints sin ninguna cobertura; una sola prueba por endpoint ya mueve la aguja más que añadir aserciones a endpoints ya tocados.`,
    );
  }
  if (summary.statusCodes.uncovered > 0) {
    lines.push(
      `2. Añadir casos para los ${summary.statusCodes.uncovered} códigos de estado documentados no ejecutados, especialmente los errores 4xx/5xx de operaciones ya probadas.`,
    );
  }
  if (summary.parameters.uncovered > 0) {
    lines.push(
      `3. Ejercitar los ${summary.parameters.uncovered} parámetros documentados no enviados (query, header, cookie y path). Ejecutar una solicitud no cubre sus parámetros.`,
    );
  }
  if (summary.endpoints.partiallyCovered > 0) {
    lines.push(
      `4. Completar los ${summary.endpoints.partiallyCovered} endpoints parciales: les falta algún método, status o parámetro documentado.`,
    );
  }
  if (aiComparison) {
    const maxDiff = Math.max(...aiComparison.estimates.map((estimate) => estimate.absoluteDifferenceVsTool));
    lines.push(
      `5. Mantener las estimaciones de IA como señal secundaria: su diferencia máxima con la herramienta fue de ${maxDiff.toFixed(2)} pp en esta línea base.`,
    );
  } else {
    lines.push('5. Ejecutar las dos estimaciones de IA y registrarlas con `--ai-estimates` para habilitar la comparación.');
  }
  lines.push('');

  lines.push('## 10. Limitaciones de la medición');
  lines.push('');
  for (const limitation of report.coverageModel.limitations) {
    lines.push(`- ${limitation}`);
  }
  lines.push('');

  lines.push('## 11. Reproducción');
  lines.push('');
  lines.push('```bash');
  lines.push('# 1) Ejecutar pruebas API grabando solicitudes');
  lines.push(`npm run coverage:record -- --project=api`);
  lines.push('');
  lines.push('# 2) Analizar contra el OpenAPI y generar reportes');
  lines.push(
    `node coverage-cli.js --spec "${relativeForDisplay(report.spec.source)}" --requests "${relativeForDisplay(report.requests.source)}" --out . --ai-estimates tools/coverage/ai-estimates.json`,
  );
  lines.push('```');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function renderEstimate(aiEstimates, index) {
  if (!aiEstimates || !aiEstimates.provided) {
    return [
      '**No se ejecutó una estimación real de IA.** No hay archivo de estimaciones (`--ai-estimates`) o no se',
      `proporcionó. ${aiEstimates && aiEstimates.reason ? aiEstimates.reason : ''}`.trim(),
      '',
      'No se presentan porcentajes inventados.',
    ];
  }
  const estimate = aiEstimates.estimates[index];
  if (!estimate) {
    return ['**No disponible.** El archivo de estimaciones no contiene una segunda estimación real.', '', 'No se presentan porcentajes inventados.'];
  }
  const lines = [
    `- Cobertura global estimada: **${formatPct(estimate.estimatedCoverage)}**`,
    `- Modelo / proveedor: ${estimate.model} / ${estimate.provider}`,
    `- Independencia: ${estimate.independence}`,
  ];
  if (estimate.counts) {
    const labels = {
      endpointsTotal: 'endpoints',
      endpointsCovered: 'endpoints cubiertos',
      operationsTotal: 'operaciones',
      operationsCovered: 'operaciones cubiertas',
      statusTotal: 'status codes',
      statusCovered: 'status cubiertos',
      parametersTotal: 'parámetros',
      parametersCovered: 'parámetros cubiertos',
    };
    const parts = Object.entries(estimate.counts).map(([key, value]) => `${labels[key] || key}=${value}`);
    lines.push(`- Conteo declarado por la IA: ${parts.join(', ')}`);
  }
  if (estimate.criteria.length > 0) {
    lines.push('- Criterios utilizados:');
    for (const criterion of estimate.criteria) lines.push(`  - ${criterion}`);
  }
  if (estimate.gaps.length > 0) {
    lines.push(`- Brechas identificadas por la IA (${estimate.gaps.length}):`);
    for (const gap of estimate.gaps.slice(0, 10)) {
      lines.push(
        `  - [${gap.category}] ${gap.method ? `${gap.method} ` : ''}${gap.endpoint || '(sin endpoint)'}${gap.description ? `: ${gap.description}` : ''}`,
      );
    }
    if (estimate.gaps.length > 10) lines.push(`  - ... y ${estimate.gaps.length - 10} más.`);
  } else {
    lines.push('- Brechas identificadas por la IA: ninguna registrada.');
  }
  if (estimate.notes) lines.push(`- Nota: ${estimate.notes}`);
  return lines;
}

function severityForCategory(category) {
  if (category === 'uncovered_endpoint' || category === 'untested_method') return 'critical';
  if (category === 'unexecuted_status_code') return 'high (low si la operación no se ejecutó)';
  if (category === 'untested_parameter') return 'medium (low si la operación no se ejecutó)';
  return 'informativa';
}

function formatPct(value) {
  return `${Number(value).toFixed(2)}%`;
}

function formatSigned(value) {
  const number = Number(value);
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}`;
}

function relativeForDisplay(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative && !relative.startsWith('..') ? relative.replace(/\\/g, '/') : filePath.replace(/\\/g, '/');
}

module.exports = { buildBaselineMarkdown };
