import { env } from '@src/core';

export const bookStaff = env.bookStaffCredentials;
export const orderStatus = { new: 1, sent: 5, pending: 10, cancelled: 20, returned: 30, delivered: 40, completed: 99 } as const;
export const missingOrderId = 999_999;
export const invalidOrderStatus = 9999;
export const orderStock = { price: 2500, quantity: 10 };
export const expensiveOrderStock = { price: 1000000, quantity: 10 };
export const emptyOrderStock = { price: 2500, quantity: 0 };
export const shippingCost = 500;
export const orderCoupons = {
  fixed: { code: '10OFF', total: 2000 },
  percentage: { code: '20OFF', total: 2500 },
  capped: { code: '50PLN', total: 0 },
  missing: 'QA-NO-SUCH-COUPON',
};
