import { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';

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
    return response;
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
