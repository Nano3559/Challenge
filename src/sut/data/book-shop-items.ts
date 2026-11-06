export const missingShopItemId = 999_999;
export const itemValues = { price: 2500, quantity: 10 };
export const updatedItemValues = { price: 3900, quantity: 7 };
export const itemBoundaries = [{ price: 0, quantity: 0 }, { price: 9999999999, quantity: 99999 }];
export type ItemValues = { price?: number | string; quantity?: number | string };
export type ItemCreate = ItemValues & { book_id?: number };
export const invalidItemValues = [
  { name: 'precio ausente', payload: { quantity: 10 }, message: 'Price is not in valid format' },
  { name: 'precio negativo', payload: { price: -1, quantity: 10 }, message: 'Price is not in valid format' },
  { name: 'precio decimal', payload: { price: 1.5, quantity: 10 }, message: 'Price is not in valid format' },
  { name: 'precio no numérico', payload: { price: 'invalid', quantity: 10 }, message: 'Price is not in valid format' },
  { name: 'precio demasiado largo', payload: { price: 10000000000, quantity: 10 }, message: 'Price is not in valid format' },
  { name: 'cantidad ausente', payload: { price: 2500 }, message: 'Quantity is not in valid format' },
  { name: 'cantidad negativa', payload: { price: 2500, quantity: -1 }, message: 'Quantity is not in valid format' },
  { name: 'cantidad decimal', payload: { price: 2500, quantity: 1.5 }, message: 'Quantity is not in valid format' },
  { name: 'cantidad no numérica', payload: { price: 2500, quantity: 'invalid' }, message: 'Quantity is not in valid format' },
  { name: 'cantidad demasiado larga', payload: { price: 2500, quantity: 100000 }, message: 'Quantity is not in valid format' },
] satisfies Array<{ name: string; payload: ItemValues; message: string }>;
