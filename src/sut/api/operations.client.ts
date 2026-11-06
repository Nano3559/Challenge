import { BaseApiClient } from '@src/core';

export class OperationsClient extends BaseApiClient {
  read(path: string, params?: Record<string, string | number>) { return this.get(`/api${path}`, params); }
  calculate(kind: 'roi' | 'simpleroi', data: Record<string, unknown>) { return this.post(`/api/calc/${kind}`, data); }
}
