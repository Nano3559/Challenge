'use strict';

const fs = require('fs');
const path = require('path');
const { CoverageError } = require('./errors');
const { log } = require('./log');

const REQUEST_FILE_PATTERN = /\.(jsonl|ndjson|json)$/i;

/**
 * Normaliza una solicitud grabada. Acepta registros del recorder de Playwright
 * y también JSONL escritos a mano. Tolera campos faltantes para no romper el
 * análisis por una línea incompleta.
 */
function normalizeRequest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const method = String(raw.method || 'GET').toUpperCase();
  const urlValue = typeof raw.url === 'string' && raw.url ? raw.url : raw.path;
  if (!urlValue || typeof urlValue !== 'string') return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(urlValue, 'http://localhost');
  } catch {
    return null;
  }

  const query = isPlainObject(raw.query) ? stringifyValues(raw.query) : queryFromUrl(parsedUrl);
  const headers = normalizeHeaders(raw.headers);
  const cookies = isPlainObject(raw.cookies) ? { ...raw.cookies } : cookiesFromHeader(headers.cookie);
  const status = Number(raw.status);

  return {
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : null,
    method,
    url: urlValue,
    path: parsedUrl.pathname || '/',
    query,
    headers,
    cookies,
    status: Number.isFinite(status) ? status : null,
    durationMs: Number.isFinite(Number(raw.durationMs)) ? Number(raw.durationMs) : null,
    testTitle: typeof raw.testTitle === 'string' ? raw.testTitle : null,
    sourceFile: typeof raw.sourceFile === 'string' ? raw.sourceFile : null,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyValues(object) {
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (Array.isArray(value)) result[key] = value.map(String);
    else if (value === undefined || value === null) result[key] = '';
    else result[key] = String(value);
  }
  return result;
}

function queryFromUrl(url) {
  const query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const previous = query[key];
      query[key] = Array.isArray(previous) ? [...previous, value] : [previous, value];
    } else {
      query[key] = value;
    }
  }
  return query;
}

function normalizeHeaders(headers) {
  const result = {};
  if (!isPlainObject(headers)) return result;
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    result[String(key).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return result;
}

/** Solo interesan los nombres de cookie para saber si el parámetro se ejercitó. */
function cookiesFromHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  const cookies = {};
  for (const part of cookieHeader.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) cookies[name] = '***';
  }
  return cookies;
}

/**
 * Carga solicitudes desde un archivo JSONL/NDJSON/JSON o un directorio.
 * Un JSON puede ser un array de solicitudes o un objeto { requests: [...] }.
 */
function loadRequests(inputPath, { allowEmpty = true } = {}) {
  if (!inputPath) {
    throw new CoverageError('Falta --requests (archivo o directorio de solicitudes).', {
      code: 'MISSING_REQUESTS',
    });
  }
  const absolute = path.resolve(inputPath);
  if (!fs.existsSync(absolute)) {
    throw new CoverageError(`No existe la ruta de solicitudes: ${absolute}`, {
      code: 'REQUESTS_NOT_FOUND',
    });
  }

  const files = collectRequestFiles(absolute);
  if (files.length === 0) {
    throw new CoverageError(`No se encontraron archivos .jsonl/.json en ${absolute}`, {
      code: 'NO_REQUEST_FILES',
    });
  }

  const requests = [];
  const warnings = [];
  for (const file of files) {
    const { parsed, fileWarnings } = loadRequestFile(file);
    warnings.push(...fileWarnings);
    for (const raw of parsed) {
      const normalized = normalizeRequest(raw);
      if (normalized) {
        requests.push({ ...normalized, sourceFile: path.basename(file) });
      } else {
        warnings.push(`${path.basename(file)}: registro de solicitud inválido ignorado.`);
      }
    }
  }

  if (requests.length === 0 && !allowEmpty) {
    throw new CoverageError(`No hay solicitudes válidas en ${absolute}`, {
      code: 'NO_REQUESTS',
    });
  }
  for (const warning of warnings) log.warn(warning);

  requests.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));

  return {
    source: absolute,
    files,
    requests,
    warnings,
    totalLines: requests.length + warnings.length,
  };
}

function collectRequestFiles(absolute) {
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];

  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && REQUEST_FILE_PATTERN.test(entry.name)) files.push(full);
    }
  };
  walk(absolute);
  return files.sort();
}

function loadRequestFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).toLowerCase();
  const warnings = [];

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return { parsed, fileWarnings: warnings };
      if (parsed && Array.isArray(parsed.requests)) return { parsed: parsed.requests, fileWarnings: warnings };
      throw new Error('el JSON no es un array ni un objeto con "requests"');
    } catch (cause) {
      throw new CoverageError(`JSON de solicitudes inválido (${file}): ${cause.message}`, {
        code: 'INVALID_REQUESTS_JSON',
        cause,
      });
    }
  }

  const parsed = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      parsed.push(JSON.parse(trimmed));
    } catch {
      warnings.push(`${path.basename(file)}:${index + 1}: línea JSONL inválida ignorada.`);
    }
  });
  return { parsed, fileWarnings: warnings };
}

module.exports = {
  loadRequests,
  normalizeRequest,
  normalizeHeaders,
  cookiesFromHeader,
  queryFromUrl,
};
