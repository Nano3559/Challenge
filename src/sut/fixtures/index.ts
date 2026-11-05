import { test as base, expect } from '@playwright/test';
import { ArticlesClient } from '@src/sut/api/articles.client';
import { AuthClient } from '@src/sut/api/auth.client';
import { LoginPage } from '@src/sut/pages/login.page';
import { users } from '@src/sut/data/users';

type Fixtures = {
  authClient: AuthClient;
  articlesClient: ArticlesClient;
  authenticatedArticlesClient: ArticlesClient;
  loginPage: LoginPage;
};

export const test = base.extend<Fixtures>({
  authClient: async ({ request }, use) => use(new AuthClient(request)),
  articlesClient: async ({ request }, use) => use(new ArticlesClient(request)),
  // Sesión por API (más rápido que loguearse por la UI) para endpoints protegidos.
  authenticatedArticlesClient: async ({ request }, use) => {
    const response = await new AuthClient(request).login(users.valid);
    const { access_token: token } = await response.json();
    await use(new ArticlesClient(request, token));
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
});

export { expect };
