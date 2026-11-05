import { BaseApiClient } from '@src/core';

/** Cliente de autenticación de GAD (JWT Bearer + cookies). */
export class AuthClient extends BaseApiClient {
  login(credentials: { email: string; password: string }) {
    return this.post('/api/login', credentials);
  }

  /** Valida el token actual: GET /api/login requiere Authorization. */
  validate() {
    return this.get('/api/login');
  }
}
