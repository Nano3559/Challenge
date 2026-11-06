import { BaseApiClient } from '@src/core';

export class BookShopPaymentCardsClient extends BaseApiClient {
  getCurrent() { return this.get('/api/book-shop-account-payment-cards'); }
  update(data: Record<string, unknown>) { return this.put('/api/book-shop-account-payment-cards', data); }
  remove() { return this.delete('/api/book-shop-account-payment-cards'); }
  topup(data: Record<string, unknown>) { return this.post('/api/book-shop-account-payment-cards/topup', data); }
}
