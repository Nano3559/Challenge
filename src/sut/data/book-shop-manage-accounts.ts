export const missingManagedAccountId = 999_999;
export const invalidManagedAccountRoles: Record<string, unknown>[] = [
  {}, { role_id: null }, { role_id: false }, { role_id: 0 }, { role_id: -1 },
  { role_id: 1.5 }, { role_id: 999_999 }, { role_id: 'qa-unknown' },
];
export const ignoredManagedAccountFields = { funds: 99999999, user_id: 999999, favorite_books_ids: [999999] };
