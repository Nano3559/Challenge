import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface RecordedRequest {
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  status: number;
  durationMs: number;
}

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'proxy-authorization', 'x-api-key']);

/**
 * Graba solicitudes HTTP en JSONL para el análisis de cobertura OpenAPI.
 * Escribe un archivo por proceso (pid) para que los workers de Playwright
 * no compitan por el mismo archivo. Nunca lanza: la grabación no debe
 * romper una prueba.
 */
export class RequestRecorder {
  constructor(private readonly directory: string) {}

  record(request: RecordedRequest): void {
    try {
      fs.mkdirSync(this.directory, { recursive: true });
      const file = path.join(this.directory, `requests-${process.pid}.jsonl`);
      fs.appendFileSync(file, `${JSON.stringify(request)}\n`, 'utf8');
    } catch (error) {
      logger.warn('No se pudo grabar la solicitud para cobertura.', error);
    }
  }
}

let recorder: RequestRecorder | null | undefined;

/** Singleton perezoso: null si la grabación está desactivada. */
export function getRequestRecorder(): RequestRecorder | null {
  if (recorder === undefined) {
    recorder = env.coverageEnabled ? new RequestRecorder(env.coverageRequestsDir) : null;
  }
  return recorder;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    result[name.toLowerCase()] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? '***' : String(value);
  }
  return result;
}

/** Solo se guardan los nombres: para cobertura basta saber si la cookie se envió. */
export function parseCookieNames(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) cookies[name] = '***';
  }
  return cookies;
}
