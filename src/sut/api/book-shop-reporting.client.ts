import { BaseApiClient } from '@src/core';

export type ShopStatsKind = 'orders' | 'users' | 'items' | 'all';

export class BookShopReportingClient extends BaseApiClient {
  history(accountId?: number) { return this.get('/api/book-shop-payment-history', accountId === undefined ? undefined : { account_id: accountId }); }
  statistics(kind: ShopStatsKind) { return this.get(`/api/book-shop-stats/${kind}`); }
  unknownStatistics() { return this.get('/api/book-shop-stats/qa-unknown'); }
  users(ids?: number[]) {
    const query = new URLSearchParams();
    ids?.forEach((id) => query.append('id', String(id)));
    return this.get(`/api/book-shop-manage/users${query.size ? `?${query}` : ''}`);
  }
  team() { return this.get('/api/book-shop-manage/team'); }
  accounts() { return this.get('/api/book-shop-manage/accounts'); }
  changeAccountRole(id: number | string, data: Record<string, unknown>) { return this.patch(`/api/book-shop-manage/accounts/${id}`, data); }
}
