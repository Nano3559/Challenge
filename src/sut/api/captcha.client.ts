import { BaseApiClient } from '@src/core';

export class CaptchaClient extends BaseApiClient {
  challenge() { return this.get('/api/captcha'); }
  verify(data: { uuid: string; result: number } | Record<string, unknown>) { return this.post('/api/captcha', data); }
}
