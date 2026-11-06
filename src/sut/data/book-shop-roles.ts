export const expectedShopRoles = [
  { id: 1, name: 'admin' },
  { id: 2, name: 'reader' },
  { id: 4, name: 'editor' },
  { id: 8, name: 'author' },
  { id: 16, name: 'delivery-coordinator' },
];
export const missingShopRoleId = 999_999;
export const rejectedShopRole = { id: missingShopRoleId, name: 'qa-rejected-role' };
export const rejectedShopRoleChange = { name: 'qa-rejected-role-change' };
export const invalidShopRoleToken = 'qa-invalid-token';
