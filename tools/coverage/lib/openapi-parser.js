'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { CoverageError } = require('./errors');
const { log } = require('./log');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

/**
 * Lee y parsea un OpenAPI 3.x desde disco (JSON o YAML).
 * La detección usa la extensión y, si es desconocida, intenta JSON y luego YAML.
 */
function loadOpenApiFile(specPath) {
  if (!specPath) {
    throw new CoverageError('Falta --spec (ruta al archivo OpenAPI).', { code: 'MISSING_SPEC' });
  }
  const absolute = path.resolve(specPath);
  if (!fs.existsSync(absolute)) {
    throw new CoverageError(`No existe el archivo OpenAPI: ${absolute}`, { code: 'SPEC_NOT_FOUND' });
  }
  const text = fs.readFileSync(absolute, 'utf8');
  const doc = parseOpenApiText(text, absolute);
  return extractOpenApi(doc, { source: absolute });
}

function parseOpenApiText(text, source = '<inline>') {
  if (typeof text !== 'string' || !text.trim()) {
    throw new CoverageError(`El archivo OpenAPI está vacío: ${source}`, { code: 'EMPTY_SPEC' });
  }

  const ext = path.extname(source).toLowerCase();
  const preferYaml = ext === '.yaml' || ext === '.yml';

  if (preferYaml) {
    try {
      return YAML.parse(text);
    } catch (cause) {
      throw new CoverageError(`YAML inválido en ${source}: ${cause.message}`, {
        code: 'INVALID_YAML',
        cause,
      });
    }
  }

  try {
    return JSON.parse(text);
  } catch (jsonError) {
    if (ext === '.json') {
      throw new CoverageError(`JSON inválido en ${source}: ${jsonError.message}`, {
        code: 'INVALID_JSON',
        cause: jsonError,
      });
    }
    // Extensión desconocida: último intento con YAML (YAML es superconjunto de JSON).
    try {
      return YAML.parse(text);
    } catch (cause) {
      throw new CoverageError(`No se pudo parsear ${source} como JSON ni como YAML.`, {
        code: 'INVALID_SPEC',
        cause,
      });
    }
  }
}

function extractOpenApi(doc, { source = '<inline>' } = {}) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new CoverageError(`El OpenAPI de ${source} no es un objeto.`, { code: 'INVALID_SPEC' });
  }
  if (doc.swagger) {
    throw new CoverageError(
      `Se detectó Swagger ${doc.swagger}; esta herramienta solo soporta OpenAPI 3.x.`,
      { code: 'UNSUPPORTED_VERSION' },
    );
  }
  if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.')) {
    throw new CoverageError(
      `Versión OpenAPI no soportada en ${source}: ${String(doc.openapi)} (se espera 3.x).`,
      { code: 'UNSUPPORTED_VERSION' },
    );
  }
  if (!doc.paths || typeof doc.paths !== 'object') {
    throw new CoverageError(`El OpenAPI de ${source} no tiene el objeto "paths".`, {
      code: 'MISSING_PATHS',
    });
  }

  const warnings = [];
  const operations = [];
  const endpointPaths = new Set();

  for (const [rawPath, rawPathItem] of Object.entries(doc.paths)) {
    if (!rawPath.startsWith('/')) {
      warnings.push(`Path ignorado (no empieza con "/"): ${rawPath}`);
      continue;
    }
    if (!rawPathItem || typeof rawPathItem !== 'object') {
      warnings.push(`Path ignorado (definición inválida): ${rawPath}`);
      continue;
    }

    const pathLevelParams = resolveParameters(doc, rawPathItem.parameters, warnings, rawPath);
    let operationsInPath = 0;

    for (const method of HTTP_METHODS) {
      const rawOperation = rawPathItem[method];
      if (!rawOperation || typeof rawOperation !== 'object') continue;
      operationsInPath += 1;

      const operationParams = resolveParameters(
        doc,
        rawOperation.parameters,
        warnings,
        `${method.toUpperCase()} ${rawPath}`,
      );
      const parameters = mergeParameters(pathLevelParams, operationParams);

      const responses = extractResponses(doc, rawOperation.responses, warnings, `${method.toUpperCase()} ${rawPath}`);
      const security = rawOperation.security !== undefined ? rawOperation.security : doc.security || [];

      operations.push({
        path: rawPath,
        method: method.toUpperCase(),
        operationId: rawOperation.operationId || null,
        summary: rawOperation.summary || null,
        tags: Array.isArray(rawOperation.tags) ? rawOperation.tags : [],
        parameters,
        responses,
        security: Array.isArray(security) ? security : [],
      });
    }

    if (operationsInPath > 0) {
      endpointPaths.add(rawPath);
    } else {
      warnings.push(`Path sin operaciones HTTP: ${rawPath}`);
    }
  }

  if (operations.length === 0) {
    throw new CoverageError(`El OpenAPI de ${source} no contiene operaciones HTTP.`, {
      code: 'NO_OPERATIONS',
    });
  }

  for (const warning of warnings) log.warn(warning);

  const servers = Array.isArray(doc.servers) && doc.servers.length > 0 ? doc.servers : [{ url: '/' }];

  return {
    source,
    openapi: doc.openapi,
    title: doc.info && doc.info.title ? doc.info.title : null,
    version: doc.info && doc.info.version ? doc.info.version : null,
    servers,
    basePaths: extractBasePaths(servers),
    endpoints: [...endpointPaths].map((endpointPath) => ({
      path: endpointPath,
      operations: operations.filter((operation) => operation.path === endpointPath),
    })),
    operations,
    warnings,
  };
}

function resolveParameters(doc, parameters, warnings, context) {
  if (!Array.isArray(parameters)) return [];
  const resolved = [];
  for (const parameter of parameters) {
    const value = resolveRef(doc, parameter, warnings, context);
    if (!value || typeof value !== 'object') {
      warnings.push(`Parámetro inválido ignorado en ${context}.`);
      continue;
    }
    if (!value.name || !value.in) {
      warnings.push(`Parámetro sin "name" o "in" ignorado en ${context}.`);
      continue;
    }
    if (!['path', 'query', 'header', 'cookie'].includes(value.in)) {
      warnings.push(`Parámetro "${value.name}" con "in=${value.in}" ignorado en ${context}.`);
      continue;
    }
    resolved.push({
      name: String(value.name),
      in: value.in,
      required: value.in === 'path' ? true : Boolean(value.required),
      description: value.description || null,
      style: value.style || null,
    });
  }
  return resolved;
}

/**
 * Combina parámetros de path item y de operación.
 * Según OpenAPI, el parámetro de la operación pisa al del path item
 * cuando coinciden en `name` + `in`. El orden se conserva y no se duplica.
 */
function mergeParameters(pathLevel, operationLevel) {
  const merged = new Map();
  for (const parameter of [...pathLevel, ...operationLevel]) {
    merged.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  return [...merged.values()];
}

function extractResponses(doc, responses, warnings, context) {
  if (!responses || typeof responses !== 'object') {
    warnings.push(`Operación sin "responses": ${context}`);
    return [];
  }
  const result = [];
  for (const [rawCode, rawResponse] of Object.entries(responses)) {
    const response = resolveRef(doc, rawResponse, warnings, context);
    const code = String(rawCode);
    if (!isValidStatusCode(code)) {
      warnings.push(`Código de estado no estándar "${code}" en ${context}; se conserva.`);
    }
    result.push({
      code,
      description: response && response.description ? response.description : null,
    });
  }
  return result;
}

function isValidStatusCode(code) {
  return code === 'default' || /^[1-5]\d\d$/.test(code) || /^[1-5]XX$/i.test(code);
}

/** Resuelve $ref locales (#/...). Los $ref remotos no se soportan. */
function resolveRef(doc, value, warnings = [], context = '') {
  if (!value || typeof value !== 'object' || typeof value.$ref !== 'string') return value;
  const ref = value.$ref;
  if (!ref.startsWith('#/')) {
    warnings.push(`$ref remoto no soportado (${ref}) en ${context}; se ignora.`);
    return null;
  }
  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = doc;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      warnings.push(`$ref no resuelto (${ref}) en ${context}; se ignora.`);
      return null;
    }
    current = current[segment];
  }
  return current;
}

/**
 * Obtiene los prefijos de servidor para normalizar paths.
 * Se incluye siempre "" porque muchas grabaciones ya llevan el prefijo
 * (p. ej. /api/articles) y otras usan el path relativo de la spec (/articles).
 */
function extractBasePaths(servers) {
  const basePaths = new Set(['']);
  for (const server of servers) {
    if (!server || typeof server.url !== 'string') continue;
    const raw = server.url.replace(/\{[^}]+\}/g, 'var');
    let pathname = raw;
    try {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
        pathname = new URL(raw).pathname;
      }
    } catch {
      // URL inválida: se usa tal cual, quitando query/hash.
    }
    pathname = pathname.split('?')[0].split('#')[0];
    pathname = pathname.replace(/\/+$/, '');
    if (pathname && pathname !== '/') {
      basePaths.add(pathname.startsWith('/') ? pathname : `/${pathname}`);
    }
  }
  return [...basePaths];
}

module.exports = {
  HTTP_METHODS,
  loadOpenApiFile,
  parseOpenApiText,
  extractOpenApi,
  mergeParameters,
  resolveRef,
  extractBasePaths,
  isValidStatusCode,
};
