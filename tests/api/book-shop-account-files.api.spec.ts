import { test, expect } from '@src/sut/fixtures';
import { AuthClient } from '@src/sut/api/auth.client';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { users } from '@src/sut/data/users';
import { startAccountSandbox } from '@src/sut/fixtures/account-sandbox';

test('book-shop-accounts/files permanece 404 con multipart vacío y token; no se envían archivos', { tag: '@regression' }, async ({ playwright }) => {
  const sandbox = await startAccountSandbox();
  const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
  try {
    const login = await new AuthClient(context).login(users.registered);
    expect(login.status()).toBe(200);
    const token = (await login.json()).access_token;
    const form = new FormData();
    const response = await new BookShopAccountsClient(context, token).uploadFiles(form);
    expect(response.status()).toBe(404);
  } finally { await context.dispose(); await sandbox.dispose(); }
});
