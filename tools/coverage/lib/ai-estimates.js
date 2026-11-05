'use strict';

const { CoverageError } = require('./errors');
const { readJsonFile } = require('./json-writer');
const { log } = require('./log');

/**
 * Carga estimaciones de IA externas. La herramienta NO genera estimaciones:
 * solo registra las que se ejecutaron realmente y las compara con el resultado.
 *
 * Formato esperado:
 * {
 *   "generatedAt": "...",
 *   "method": "descripción de cómo se obtuvieron",
 *   "estimates": [
 *     { "id": 1, "model": "...", "estimatedCoverage": 12.5,
 *       "criteria": ["..."], "gaps": [{ "category": "...", "endpoint": "...", "method": "GET", "description": "..." }] }
 *   ]
 * }
 */
function loadAiEstimates(filePath) {
  if (!filePath) {
    return {
      provided: false,
      reason:
        'No se pasó --ai-estimates. No se ejecutó ninguna estimación real de IA y no se inventan porcentajes.',
      estimates: [],
      method: null,
      generatedAt: null,
    };
  }

  const data = readJsonFile(filePath);
  if (!data || typeof data !== 'object' || !Array.isArray(data.estimates)) {
    throw new CoverageError(
      `El archivo de estimaciones IA debe tener un array "estimates": ${filePath}`,
      { code: 'INVALID_AI_ESTIMATES' },
    );
  }

  const estimates = data.estimates.map((estimate, index) => {
    const id = Number(estimate.id ?? index + 1);
    const coverage = Number(estimate.estimatedCoverage ?? estimate.coverage);
    if (!Number.isFinite(id)) {
      throw new CoverageError(`Estimación IA sin id numérico (índice ${index}).`, {
        code: 'INVALID_AI_ESTIMATES',
      });
    }
    if (!Number.isFinite(coverage) || coverage < 0 || coverage > 100) {
      throw new CoverageError(
        `Estimación IA ${id} sin "estimatedCoverage" numérico entre 0 y 100.`,
        { code: 'INVALID_AI_ESTIMATES' },
      );
    }
    if (estimate.gaps !== undefined && !Array.isArray(estimate.gaps)) {
      throw new CoverageError(`Estimación IA ${id}: "gaps" debe ser un array.`, {
        code: 'INVALID_AI_ESTIMATES',
      });
    }
    return {
      id,
      model: estimate.model || 'no especificado',
      provider: estimate.provider || 'no especificado',
      independence: estimate.independence || 'no especificada',
      estimatedCoverage: round2(coverage),
      counts: normalizeCounts(estimate.counts),
      criteria: normalizeCriteria(estimate.criteria),
      gaps: (estimate.gaps || []).map((gap, gapIndex) => ({
        id: gap.id || `ai-${id}-${gapIndex + 1}`,
        category: gap.category || 'unspecified',
        endpoint: gap.endpoint || null,
        method: gap.method || null,
        description: gap.description || '',
      })),
      notes: estimate.notes || null,
    };
  });

  if (estimates.length < 2) {
    log.warn(
      `Solo hay ${estimates.length} estimación(es) de IA. El informe marcará la faltante como no ejecutada.`,
    );
  }

  return {
    provided: true,
    reason: null,
    source: filePath,
    generatedAt: data.generatedAt || null,
    method: data.method || null,
    estimates,
  };
}

function normalizeCriteria(criteria) {
  if (Array.isArray(criteria)) return criteria.map(String);
  if (typeof criteria === 'string' && criteria.trim()) return [criteria.trim()];
  return [];
}

function normalizeCounts(counts) {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return null;
  const normalized = {};
  for (const [key, value] of Object.entries(counts)) {
    const number = Number(value);
    if (Number.isFinite(number)) normalized[key] = number;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

/** Compara las estimaciones entre sí y contra la cobertura global de la herramienta. */
function compareEstimates(aiEstimates, toolCoverage) {
  if (!aiEstimates.provided || aiEstimates.estimates.length === 0) {
    return null;
  }
  const values = aiEstimates.estimates.map((estimate) => estimate.estimatedCoverage);
  const variation = values.length >= 2 ? round2(Math.abs(values[0] - values[1])) : null;
  return {
    toolCoverage: round2(toolCoverage),
    estimates: aiEstimates.estimates.map((estimate) => ({
      id: estimate.id,
      estimatedCoverage: estimate.estimatedCoverage,
      differenceVsTool: round2(estimate.estimatedCoverage - toolCoverage),
      absoluteDifferenceVsTool: round2(Math.abs(estimate.estimatedCoverage - toolCoverage)),
    })),
    variationBetweenEstimates: variation,
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { loadAiEstimates, compareEstimates };
