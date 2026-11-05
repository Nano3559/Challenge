export const missingShopAccountId = 999_999;
export const shopAddress = { country: 'Bolivia', city: 'La Paz', street: 'Calle de prueba', postal_code: '0000' };
export const invalidShopAddress = { country: 'x'.repeat(257) };
export const shopRoleSelection = { allowed: [2], denied: [1] };
export type ShopAddress = Partial<typeof shopAddress>;
