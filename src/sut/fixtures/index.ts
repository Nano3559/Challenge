import { test as base, expect } from '@playwright/test';
import { ArticlesClient } from '@src/sut/api/articles.client';
import { AuthClient } from '@src/sut/api/auth.client';
import { UsersClient } from '@src/sut/api/users.client';
import { BooksClient } from '@src/sut/api/books.client';
import { BookAuthorsClient } from '@src/sut/api/book-authors.client';
import { BookGenresClient } from '@src/sut/api/book-genres.client';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { bookManager, bookReader } from '@src/sut/data/books';
import { LoginPage } from '@src/sut/pages/login.page';
import { users } from '@src/sut/data/users';
import { startAccountSandbox } from './account-sandbox';

type AccountSandbox = {
  users: UsersClient;
  auth: AuthClient;
  anonymous: BookShopAccountsClient;
  forToken: (token: string) => BookShopAccountsClient;
};

type Fixtures = {
  accountSandbox: AccountSandbox;
  bookShopAccountsClient: BookShopAccountsClient;
  bookShopAccountsForToken: (token: string) => BookShopAccountsClient;
  bookAuthorsClient: BookAuthorsClient;
  bookGenresClient: BookGenresClient;
  booksClient: BooksClient;
  booksClientForToken: (token: string) => BooksClient;
  managerBooksClient: BooksClient;
  readerBooksClient: BooksClient;
  readerBookShopAccount: BookShopAccountsClient;
  bookReaderToken: string;
  managerBookShopAccount: BookShopAccountsClient;
  bookManagerToken: string;
  usersClient: UsersClient;
  usersClientForToken: (token: string) => UsersClient;
  adminUsersClient: UsersClient;
  authClient: AuthClient;
  authenticatedAuthClient: AuthClient;
  articlesClient: ArticlesClient;
  authenticatedArticlesClient: ArticlesClient;
  registeredArticlesClient: ArticlesClient;
  loginPage: LoginPage;
};

export const test = base.extend<Fixtures, { isolatedAccountDatabase: Awaited<ReturnType<typeof startAccountSandbox>> }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requiere desestructurar las dependencias de la fixture.
  isolatedAccountDatabase: [async ({}, use) => {
    const sandbox = await startAccountSandbox();
    try { await use(sandbox); }
    finally { await sandbox.dispose(); }
  }, { scope: 'worker', timeout: 45_000 }],
  accountSandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      await use({
        users: new UsersClient(context), auth: new AuthClient(context),
        anonymous: new BookShopAccountsClient(context),
        forToken: (token) => new BookShopAccountsClient(context, token),
      });
    } finally { await context.dispose(); }
  },
  bookShopAccountsClient: async ({ request }, use) => use(new BookShopAccountsClient(request)),
  bookShopAccountsForToken: async ({ request }, use) => use((token) => new BookShopAccountsClient(request, token)),
  bookAuthorsClient: async ({ request }, use) => use(new BookAuthorsClient(request)),
  bookGenresClient: async ({ request }, use) => use(new BookGenresClient(request)),
  booksClient: async ({ request }, use) => use(new BooksClient(request)),
  booksClientForToken: async ({ request }, use) => use((token) => new BooksClient(request, token)),
  bookManagerToken: async ({ authClient }, use) => {
    const response = await authClient.login(bookManager);
    const { access_token: token } = await response.json();
    await use(token);
  },
  managerBooksClient: async ({ request, bookManagerToken }, use) => use(new BooksClient(request, bookManagerToken)),
  managerBookShopAccount: async ({ request, bookManagerToken }, use) => use(new BookShopAccountsClient(request, bookManagerToken)),
  bookReaderToken: async ({ authClient }, use) => {
    const response = await authClient.login(bookReader);
    const { access_token: token } = await response.json();
    await use(token);
  },
  readerBooksClient: async ({ request, bookReaderToken }, use) => use(new BooksClient(request, bookReaderToken)),
  readerBookShopAccount: async ({ request, bookReaderToken }, use) => use(new BookShopAccountsClient(request, bookReaderToken)),
  usersClient: async ({ request }, use) => use(new UsersClient(request)),
  usersClientForToken: async ({ request }, use) => use((token) => new UsersClient(request, token)),
  adminUsersClient: async ({ request }, use) => {
    const response = await new AuthClient(request).login(users.valid);
    const { access_token: token } = await response.json();
    await use(new UsersClient(request, token));
  },
  authClient: async ({ request }, use) => use(new AuthClient(request)),
  authenticatedAuthClient: async ({ request }, use) => {
    const response = await new AuthClient(request).login(users.registered);
    const { access_token: token } = await response.json();
    await use(new AuthClient(request, token));
  },
  articlesClient: async ({ request }, use) => use(new ArticlesClient(request)),
  registeredArticlesClient: async ({ request }, use) => {
    const response = await new AuthClient(request).login(users.registered);
    const { access_token: token } = await response.json();
    await use(new ArticlesClient(request, token));
  },
  // Sesión por API (más rápido que loguearse por la UI) para endpoints protegidos.
  authenticatedArticlesClient: async ({ request }, use) => {
    const response = await new AuthClient(request).login(users.valid);
    const { access_token: token } = await response.json();
    await use(new ArticlesClient(request, token));
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
});

export { expect };
