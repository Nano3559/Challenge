'use strict';

const CRITICAL_CATEGORIES = ['uncovered_endpoint', 'untested_method'];

/**
 * Analiza solicitudes grabadas contra el OpenAPI y devuelve el reporte
 * estructurado + la lista de brechas. Es una función pura: no escribe archivos.
 */
function buildCoverageReport({ spec, requestStore, generatedAt = new Date().toISOString() }) {
  const matcher = buildOperationMatcher(spec);
  const stats = new Map();
  for (const operation of spec.operations) {
    const operationStats = emptyStats();
    for (const parameter of operation.parameters) {
      operationStats.parameters.set(parameterKey(parameter), { covered: false, observedValues: new Set() });
    }
    stats.set(operationKey(operation), operationStats);
  }

  const unmatchedRequests = [];

  for (const request of requestStore.requests) {
    const match = matchRequest(matcher, request, spec.basePaths);
    if (!match) {
      unmatchedRequests.push({
        method: request.method,
        path: request.path,
        url: request.url,
        status: request.status,
        timestamp: request.timestamp,
        reason: 'No coincide con ningún path/método documentado (considerando los servidores de la spec).',
      });
      continue;
    }

    const operationStats = stats.get(operationKey(match.operation));
    operationStats.requestCount += 1;
    if (request.status !== null) operationStats.statuses.add(request.status);

    for (const parameter of match.operation.parameters) {
      const value = readParameterValue(request, parameter, match.pathParams);
      if (!value.found) continue;
      const parameterStats = operationStats.parameters.get(parameterKey(parameter));
      parameterStats.covered = true;
      if (value.value !== undefined && value.value !== null && value.value !== '') {
        parameterStats.observedValues.add(truncate(String(value.value), 120));
      }
    }
  }

  const operationsReport = spec.operations.map((operation) => {
    const operationStats = stats.get(operationKey(operation));
    const explicitCodes = operation.responses.map((response) => response.code);
    const statusCodes = operation.responses.map((response) =>
      buildStatusCoverage(response, operationStats.statuses, explicitCodes),
    );
    const parameters = operation.parameters.map((parameter) => {
      const parameterStats = operationStats.parameters.get(parameterKey(parameter));
      return {
        name: parameter.name,
        in: parameter.in,
        required: parameter.required,
        covered: parameterStats.covered,
        observedValues: [...parameterStats.observedValues].slice(0, 5),
      };
    });

    return {
      path: operation.path,
      method: operation.method,
      operationId: operation.operationId,
      summary: operation.summary,
      covered: operationStats.requestCount > 0,
      requestCount: operationStats.requestCount,
      statusCodes,
      parameters,
    };
  });

  const endpoints = spec.endpoints.map((endpoint) => {
    const endpointOperations = operationsReport.filter((operation) => operation.path === endpoint.path);
    const coveredOperations = endpointOperations.filter((operation) => operation.covered);
    const allOperationsCovered = coveredOperations.length === endpointOperations.length;
    const allStatusCodesCovered = endpointOperations.every((operation) =>
      operation.statusCodes.every((statusCode) => statusCode.covered),
    );
    const allParametersCovered = endpointOperations.every((operation) =>
      operation.parameters.every((parameter) => parameter.covered),
    );

    let coverage = 'none';
    if (coveredOperations.length > 0) coverage = 'partial';
    if (allOperationsCovered && allStatusCodesCovered && allParametersCovered) coverage = 'full';

    return {
      path: endpoint.path,
      covered: coveredOperations.length > 0,
      coverage,
      operations: endpointOperations,
    };
  });

  const summary = buildSummary({ endpoints, operationsReport, spec, requestStore, unmatchedRequests });
  const gaps = buildGaps({ endpoints, operationsReport });

  const report = {
    generatedAt,
    spec: {
      source: spec.source,
      openapi: spec.openapi,
      title: spec.title,
      version: spec.version,
      servers: spec.servers,
      basePaths: spec.basePaths,
      warnings: spec.warnings,
    },
    requests: {
      source: requestStore.source,
      files: requestStore.files,
      total: requestStore.requests.length,
      matched: requestStore.requests.length - unmatchedRequests.length,
      unmatched: unmatchedRequests.length,
    },
    summary,
    coverageModel: coverageModel(),
    endpoints,
    unmatchedRequests,
  };

  const gapReport = {
    generatedAt,
    spec: {
      source: spec.source,
      openapi: spec.openapi,
      title: spec.title,
      version: spec.version,
    },
    summary: summarizeGaps(gaps),
    gaps,
  };

  return { report, gapReport };
}

function coverageModel() {
  return {
    units: 'operaciones documentadas + códigos de estado documentados + parámetros documentados',
    globalFormula: 'unidades cubiertas / unidades totales (operaciones + status codes + parámetros)',
    endpointCoverage:
      'un endpoint está cubierto si al menos una de sus operaciones recibió una solicitud que coincidió con la spec',
    fullEndpointDefinition:
      'un endpoint es "full" si todas sus operaciones recibieron al menos una solicitud, todos sus status codes documentados fueron observados y todos sus parámetros documentados fueron ejercitados',
    parameterCoverage:
      'un parámetro está cubierto si al menos una solicitud de esa operación lo envió en la ubicación documentada (path/query/header/cookie); enviar una solicitud NO cubre automáticamente todos sus parámetros',
    statusCodeCoverage:
      'un status code documentado está cubierto si alguna solicitud de esa operación recibió exactamente ese código; los rangos (2XX) y "default" se interpretan según OpenAPI',
    gapsScope:
      'las brechas de status/parámetro de operaciones nunca ejecutadas se incluyen con severidad "low" para evitar duplicar el peso de "untested_method"',
    security:
      'los esquemas de seguridad (p. ej. bearerAuth) no se cuentan como parámetros; solo se miden parámetros declarados en "parameters"',
    limitations: [
      'Solo se registran solicitudes hechas con APIRequestContext (clientes del framework); las solicitudes que dispara la UI con el navegador no se graban en esta primera versión.',
      'La comparación es a nivel de contrato: no valida el cuerpo de la respuesta, solo método, path, status y presencia de parámetros.',
      'Un requestBody documentado no se cuenta como parámetro; su cobertura no se mide.',
      'Los $ref remotos y los servidores con variables complejas no se resuelven por completo.',
      'Un código "default" se considera cubierto si se observó un status que no coincide con ningún código explícito documentado.',
    ],
  };
}

function emptyStats() {
  return {
    requestCount: 0,
    statuses: new Set(),
    parameters: new Map(),
  };
}

function buildSummary({ endpoints, operationsReport, spec, requestStore, unmatchedRequests }) {
  const endpointCovered = endpoints.filter((endpoint) => endpoint.covered).length;
  const operationCovered = operationsReport.filter((operation) => operation.covered).length;
  const statusTotal = operationsReport.reduce((total, operation) => total + operation.statusCodes.length, 0);
  const statusCovered = operationsReport.reduce(
    (total, operation) => total + operation.statusCodes.filter((statusCode) => statusCode.covered).length,
    0,
  );
  const parameterTotal = operationsReport.reduce((total, operation) => total + operation.parameters.length, 0);
  const parameterCovered = operationsReport.reduce(
    (total, operation) => total + operation.parameters.filter((parameter) => parameter.covered).length,
    0,
  );

  const totalUnits = operationsReport.length + statusTotal + parameterTotal;
  const coveredUnits = operationCovered + statusCovered + parameterCovered;

  return {
    endpoints: {
      total: endpoints.length,
      covered: endpointCovered,
      uncovered: endpoints.length - endpointCovered,
      fullyCovered: endpoints.filter((endpoint) => endpoint.coverage === 'full').length,
      partiallyCovered: endpoints.filter((endpoint) => endpoint.coverage === 'partial').length,
      percentage: percentage(endpointCovered, endpoints.length),
    },
    operations: {
      total: operationsReport.length,
      covered: operationCovered,
      uncovered: operationsReport.length - operationCovered,
      percentage: percentage(operationCovered, operationsReport.length),
    },
    statusCodes: {
      total: statusTotal,
      covered: statusCovered,
      uncovered: statusTotal - statusCovered,
      percentage: percentage(statusCovered, statusTotal),
    },
    parameters: {
      total: parameterTotal,
      covered: parameterCovered,
      uncovered: parameterTotal - parameterCovered,
      percentage: percentage(parameterCovered, parameterTotal),
    },
    global: {
      totalUnits,
      coveredUnits,
      percentage: percentage(coveredUnits, totalUnits),
      formula: 'coveredUnits / totalUnits',
    },
    requests: {
      total: requestStore.requests.length,
      matched: requestStore.requests.length - unmatchedRequests.length,
      unmatched: unmatchedRequests.length,
      files: requestStore.files.length,
    },
    spec: {
      paths: spec.endpoints.length,
      operations: spec.operations.length,
      servers: spec.servers.map((server) => server.url),
      basePaths: spec.basePaths,
    },
  };
}

function buildGaps({ endpoints, operationsReport }) {
  const gaps = [];

  for (const endpoint of endpoints) {
    if (endpoint.covered) continue;
    gaps.push({
      severity: 'critical',
      category: 'uncovered_endpoint',
      endpoint: endpoint.path,
      method: '*',
      methods: endpoint.operations.map((operation) => operation.method),
      description: `El endpoint ${endpoint.path} no recibió ninguna solicitud que coincida con la especificación.`,
    });
  }

  for (const operation of operationsReport) {
    const coordinate = `${operation.method} ${operation.path}`;
    const operationTested = operation.covered;

    if (!operationTested) {
      gaps.push({
        severity: 'critical',
        category: 'untested_method',
        endpoint: operation.path,
        method: operation.method,
        description: `La operación ${coordinate} está documentada pero no fue ejecutada por ninguna prueba.`,
      });
    }

    for (const statusCode of operation.statusCodes) {
      if (statusCode.covered) continue;
      gaps.push({
        severity: operationTested ? 'high' : 'low',
        category: 'unexecuted_status_code',
        endpoint: operation.path,
        method: operation.method,
        statusCode: statusCode.code,
        description: operationTested
          ? `La operación ${coordinate} fue ejecutada, pero nunca devolvió el status ${statusCode.code} documentado.`
          : `La operación ${coordinate} no fue ejecutada; por lo tanto el status ${statusCode.code} documentado tampoco se verificó.`,
      });
    }

    for (const parameter of operation.parameters) {
      if (parameter.covered) continue;
      gaps.push({
        severity: operationTested ? 'medium' : 'low',
        category: 'untested_parameter',
        endpoint: operation.path,
        method: operation.method,
        parameter: parameter.name,
        parameterIn: parameter.in,
        description: operationTested
          ? `La operación ${coordinate} fue ejecutada, pero el parámetro ${parameter.in}:${parameter.name} nunca se envió.`
          : `La operación ${coordinate} no fue ejecutada; por lo tanto el parámetro ${parameter.in}:${parameter.name} tampoco se ejercitó.`,
      });
    }
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.category.localeCompare(b.category) ||
      a.endpoint.localeCompare(b.endpoint) ||
      a.method.localeCompare(b.method),
  );

  for (const gap of gaps) {
    gap.id = [
      gap.category,
      gap.method,
      gap.endpoint,
      gap.statusCode || gap.parameter || gap.parameterIn || '',
    ].join('|');
  }
  return gaps;
}

function summarizeGaps(gaps) {
  const byCategory = {};
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const gap of gaps) {
    byCategory[gap.category] = (byCategory[gap.category] || 0) + 1;
    bySeverity[gap.severity] = (bySeverity[gap.severity] || 0) + 1;
  }
  return {
    total: gaps.length,
    critical: bySeverity.critical || 0,
    criticalCategories: CRITICAL_CATEGORIES,
    byCategory,
    bySeverity,
  };
}

function buildOperationMatcher(spec) {
  const operations = spec.operations
    .map((operation) => {
      const compiled = compilePathTemplate(operation.path);
      return {
        operation,
        regex: compiled.regex,
        paramNames: compiled.paramNames,
        literalLength: operation.path.replace(/\{[^/}]+\}/g, '').length,
      };
    })
    .sort((a, b) => b.literalLength - a.literalLength || a.operation.path.length - b.operation.path.length);
  return { operations };
}

function compilePathTemplate(template) {
  const paramNames = [];
  const parts = String(template).split(/(\{[^/}]+\})/g);
  const pattern = parts
    .map((part) => {
      if (/^\{[^/}]+\}$/.test(part)) {
        paramNames.push(part.slice(1, -1));
        return '([^/]+)';
      }
      return escapeRegExp(part);
    })
    .join('');
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

function matchRequest(matcher, request, basePaths) {
  const pathname = normalizePathname(request.path);
  const candidates = candidatePaths(pathname, basePaths);
  let best = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    for (const entry of matcher.operations) {
      if (entry.operation.method !== request.method) continue;
      const result = entry.regex.exec(candidate);
      if (!result) continue;
      const score = entry.literalLength * 1000 - candidate.length;
      if (score <= bestScore) continue;
      const pathParams = {};
      entry.paramNames.forEach((name, index) => {
        pathParams[name] = safeDecode(result[index + 1]);
      });
      best = { operation: entry.operation, candidate, pathParams };
      bestScore = score;
    }
  }
  return best;
}

function candidatePaths(pathname, basePaths) {
  const candidates = new Set([pathname]);
  for (const prefix of basePaths || []) {
    if (!prefix) continue;
    if (pathname === prefix) {
      candidates.add('/');
    } else if (pathname.startsWith(`${prefix}/`)) {
      candidates.add(pathname.slice(prefix.length));
    }
  }
  return [...candidates];
}

function normalizePathname(value) {
  let pathname = String(value || '/').split('?')[0].split('#')[0];
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  return pathname || '/';
}

function readParameterValue(request, parameter, pathParams) {
  const name = parameter.name;
  switch (parameter.in) {
    case 'path':
      return Object.prototype.hasOwnProperty.call(pathParams, name)
        ? { found: true, value: pathParams[name] }
        : { found: false };
    case 'query':
      return Object.prototype.hasOwnProperty.call(request.query, name)
        ? { found: true, value: request.query[name] }
        : { found: false };
    case 'header': {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(request.headers, key)
        ? { found: true, value: request.headers[key] }
        : { found: false };
    }
    case 'cookie':
      return Object.prototype.hasOwnProperty.call(request.cookies, name)
        ? { found: true, value: request.cookies[name] }
        : { found: false };
    default:
      return { found: false };
  }
}

function buildStatusCoverage(response, observedStatuses, explicitCodes) {
  const observed = [...observedStatuses];
  return {
    code: response.code,
    description: response.description,
    covered: statusCodeCovered(response.code, observed, explicitCodes),
    observedCount: observed.filter((status) => statusMatches(response.code, status, explicitCodes)).length,
  };
}

/**
 * Cubre un código documentado. `explicitCodes` solo es necesario para
 * interpretar "default" (status observado que no cae en ningún código explícito).
 */
function statusCodeCovered(code, observedStatuses, explicitCodes = []) {
  return observedStatuses.some((status) => statusMatches(code, status, explicitCodes));
}

function statusMatches(documentedCode, observedStatus, explicitCodes = []) {
  if (!Number.isFinite(observedStatus)) return false;
  if (documentedCode === 'default') {
    const isExplicit = explicitCodes.some(
      (code) => code !== 'default' && statusMatches(code, observedStatus, []),
    );
    return !isExplicit;
  }
  if (/^[1-5]XX$/i.test(documentedCode)) {
    return Math.floor(observedStatus / 100) === Number(documentedCode[0]);
  }
  return Number(documentedCode) === observedStatus;
}

function operationKey(operation) {
  return `${operation.method} ${operation.path}`;
}

function parameterKey(parameter) {
  return `${parameter.in}:${parameter.name}`;
}

function percentage(covered, total) {
  if (total === 0) return 100;
  return round2((covered / total) * 100);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  CRITICAL_CATEGORIES,
  buildCoverageReport,
  compilePathTemplate,
  matchRequest,
  normalizePathname,
  statusMatches,
  percentage,
  _private: { buildOperationMatcher, candidatePaths },
};
