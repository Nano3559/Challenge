import { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';
import { getRequestRecorder, parseCookieNames, redactHeaders } from './request-recorder';

type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
    options: { params?: Record<string, string | number>; data?: unknown; multipart?: FormData; headers?: Record<string, string> } = {},
  ): Promise<APIResponse> {
    const started = Date.now();
    const headers = { ...this.headers, ...options.headers };
    const response = await this.request.fetch(path, { ...options, method, headers });
    logger.debug(`${method} ${path} -> ${response.status()} (${Date.now() - started}ms)`);
    this.record(method, response, Date.now() - started, headers);
    return response;
  }

  /** Registra la solicitud si COVERAGE_REQUESTS=true. Un fallo aquí no debe romper el test. */
  private record(method: Method, response: APIResponse, durationMs: number, requestHeaders: Record<string, string>): void {
    const recorder = getRequestRecorder();
    if (!recorder) return;
    try {
      // Solo se registran headers enviados explícitamente por el cliente.
      // Playwright puede añadir otros (accept, content-type, cookies del contexto);
      // no se inventan aquí. Ver limitaciones en el reporte.
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
  protected getWithHeaders(path: string, params: Record<string, string | number>, headers: Record<string, string>) {
    return this.send('GET', path, { params, headers });
  }
  protected postWithHeaders(path: string, data: unknown, headers: Record<string, string>) {
    return this.send('POST', path, { data, headers });
  }

  protected head(path: string) {
    return this.send('HEAD', path);
  }
  protected post(path: string, data?: unknown) {
    return this.send('POST', path, { data });
  }
  protected postMultipart(path: string, multipart: FormData) {
    return this.send('POST', path, { multipart });
  }

  protected postRawJson(path: string, data: string) {
    return this.send('POST', path, { data: Buffer.from(data), headers: { 'content-type': 'application/json' } });
  }
  protected put(path: string, data?: unknown) {
    return this.send('PUT', path, { data });
  }
  protected patch(path: string, data?: unknown) {
    return this.send('PATCH', path, { data });
  }
  protected sendRawJson(method: 'PUT' | 'PATCH' | 'DELETE', path: string, data: string) {
    return this.send(method, path, { data: Buffer.from(data), headers: { 'content-type': 'application/json' } });
  }
  protected delete(path: string) {
    return this.send('DELETE', path);
  }
  protected deleteWithBody(path: string, data: unknown) {
    return this.send('DELETE', path, { data });
  }
}
