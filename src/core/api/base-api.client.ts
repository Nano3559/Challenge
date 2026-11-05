import { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';
import { getRequestRecorder, parseCookieNames, redactHeaders } from './request-recorder';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Cliente base de API (agnóstico de la app).
 * Los clientes concretos heredan de aquí. Nunca contiene aserciones.
 */
export abstract class BaseApiClient {
  constructor(
    protected readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  private get headers(): Record<string, string> | undefined {
    return this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
  }

  private async send(
    method: Method,
    path: string,
    options: { params?: Record<string, string | number>; data?: unknown } = {},
  ): Promise<APIResponse> {
    const started = Date.now();
    const response = await this.request.fetch(path, { method, headers: this.headers, ...options });
    logger.debug(`${method} ${path} -> ${response.status()} (${Date.now() - started}ms)`);
    this.record(method, response, Date.now() - started);
    return response;
  }

  /** Registra la solicitud si COVERAGE_REQUESTS=true. Un fallo aquí no debe romper el test. */
  private record(method: Method, response: APIResponse, durationMs: number): void {
    const recorder = getRequestRecorder();
    if (!recorder) return;
    try {
      // Solo se registran headers enviados explícitamente por el cliente.
      // Playwright puede añadir otros (accept, content-type, cookies del contexto);
      // no se inventan aquí. Ver limitaciones en el reporte.
      const requestHeaders: Record<string, string> = { ...(this.headers ?? {}) };
      const url = new URL(response.url());
      const query: Record<string, string | string[]> = {};
      for (const key of new Set(url.searchParams.keys())) {
        const values = url.searchParams.getAll(key);
        query[key] = values.length > 1 ? values : values[0];
      }
      recorder.record({
        timestamp: new Date().toISOString(),
        method,
        url: response.url(),
        path: url.pathname,
        query,
        headers: redactHeaders(requestHeaders),
        cookies: parseCookieNames(requestHeaders.cookie),
        status: response.status(),
        durationMs,
      });
    } catch (error) {
      logger.warn('No se pudo registrar la solicitud para cobertura.', error);
    }
  }

  protected get(path: string, params?: Record<string, string | number>) {
    return this.send('GET', path, { params });
  }
  protected post(path: string, data?: unknown) {
    return this.send('POST', path, { data });
  }
  protected put(path: string, data?: unknown) {
    return this.send('PUT', path, { data });
  }
  protected delete(path: string) {
    return this.send('DELETE', path);
  }
}
