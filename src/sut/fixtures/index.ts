import { test as base, expect } from '@playwright/test';
import { ArticlesClient } from '@src/sut/api/articles.client';
import { OperationsClient } from '@src/sut/api/operations.client';
import { QuizClient } from '@src/sut/api/quiz.client';
import { HangmanClient } from '@src/sut/api/hangman.client';
import { MinesweeperClient } from '@src/sut/api/minesweeper.client';
import { TicTacToeClient } from '@src/sut/api/tic-tac-toe.client';
import { FilesClient } from '@src/sut/api/files.client';
import { CaptchaClient } from '@src/sut/api/captcha.client';
import { CommunityClient } from '@src/sut/api/community.client';
import { CommentsClient } from '@src/sut/api/comments.client';
import { ArticleSocialClient } from '@src/sut/api/article-social.client';
import { AuthClient } from '@src/sut/api/auth.client';
import { UsersClient } from '@src/sut/api/users.client';
import { BooksClient } from '@src/sut/api/books.client';
import { BookAuthorsClient } from '@src/sut/api/book-authors.client';
import { BookGenresClient } from '@src/sut/api/book-genres.client';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { BookShopItemsClient } from '@src/sut/api/book-shop-items.client';
import { BookReviewsClient } from '@src/sut/api/book-reviews.client';
import { BookShopOrdersClient } from '@src/sut/api/book-shop-orders.client';
import { BookShopOrderStatusesClient } from '@src/sut/api/book-shop-order-statuses.client';
import { BookShopOrderItemsClient } from '@src/sut/api/book-shop-order-items.client';
import { BookShopRolesClient } from '@src/sut/api/book-shop-roles.client';
import { BookShopReportingClient } from '@src/sut/api/book-shop-reporting.client';
import { BookShopPaymentCardsClient } from '@src/sut/api/book-shop-payment-cards.client';
import { invalidShopRoleToken } from '@src/sut/data/book-shop-roles';
import { bookStaff } from '@src/sut/data/book-shop-orders';
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

export type InventorySandbox = {
  anonymous: BookShopItemsClient;
  manager: BookShopItemsClient;
  reader: BookShopItemsClient;
  books: BooksClient;
  users: UsersClient;
  auth: AuthClient;
  forToken: (token: string) => BookShopItemsClient;
  usersForToken: (token: string) => UsersClient;
};

export type OrderSandbox = {
  anonymousOrderItems: BookShopOrderItemsClient;
  orderItemsForToken: (token: string) => BookShopOrderItemsClient;
  anonymous: BookShopOrdersClient;
  manager: BookShopOrdersClient;
  reader: BookShopOrdersClient;
  admin: BookShopOrdersClient;
  managerAccount: BookShopAccountsClient;
  books: BooksClient;
  items: BookShopItemsClient;
  users: UsersClient;
  auth: AuthClient;
  forToken: (token: string) => BookShopOrdersClient;
  accountsForToken: (token: string) => BookShopAccountsClient;
};

type Fixtures = {
  operationsClient: OperationsClient;
  freshOperationsClient: OperationsClient;
  isolatedOperationsClient: OperationsClient;
  quizSandbox: { anonymous: QuizClient; player: QuizClient };
  hangmanSandbox: { anonymous: HangmanClient; player: HangmanClient };
  minesweeperSandbox: { anonymous: MinesweeperClient; player: MinesweeperClient };
  ticTacToeSandbox: { anonymous: TicTacToeClient; player: TicTacToeClient; opponent: TicTacToeClient; outsider: TicTacToeClient };
  filesCaptchaSandbox: { files: FilesClient; anonymousFiles: FilesClient; captcha: CaptchaClient };
  commentSandbox: {
    anonymous: CommentsClient; owner: CommentsClient; other: CommentsClient; articles: ArticlesClient;
    social: ArticleSocialClient; anonymousSocial: ArticleSocialClient; otherSocial: ArticleSocialClient;
    socialForToken: (token: string) => ArticleSocialClient; users: UsersClient; auth: AuthClient;
    community: CommunityClient; anonymousCommunity: CommunityClient; otherCommunity: CommunityClient;
    communityForToken: (token: string) => CommunityClient;
  };
  paymentCardsSandbox: {
    anonymous: BookShopPaymentCardsClient; invalidToken: BookShopPaymentCardsClient; withoutAccount: BookShopPaymentCardsClient;
    forToken: (token: string) => BookShopPaymentCardsClient;
  };
  shopReportingSandbox: {
    clients: Record<'anonymous' | 'admin' | 'reader' | 'staff' | 'withoutAccount' | 'invalidToken', BookShopReportingClient>;
    forToken: (token: string) => BookShopReportingClient;
  };
  bookShopRolesSandbox: Record<'anonymous' | 'admin' | 'reader' | 'staff' | 'withoutAccount' | 'invalidToken', BookShopRolesClient>;
  bookShopOrderStatusesClient: BookShopOrderStatusesClient;
  orderSandbox: OrderSandbox;
  bookReviewsClient: BookReviewsClient;
  inventorySandbox: InventorySandbox;
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

export const test = base.extend<Fixtures, {
  isolatedAccountDatabase: Awaited<ReturnType<typeof startAccountSandbox>>;
  isolatedSocialDatabase: Awaited<ReturnType<typeof startAccountSandbox>>;
}>({
  operationsClient: async ({ request }, use) => use(new OperationsClient(request)),
  freshOperationsClient: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try { await use(new OperationsClient(context)); }
    finally { await context.dispose(); await sandbox.dispose(); }
  },
  isolatedOperationsClient: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try { await use(new OperationsClient(context)); }
    finally { await context.dispose(); await sandbox.dispose(); }
  },
  quizSandbox: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const auth = new AuthClient(context);
      const login = await auth.login(users.registered);
      if (login.status() !== 200) throw new Error(`Login de quiz fallido: ${login.status()}`);
      const { access_token: token } = await login.json();
      await use({ anonymous: new QuizClient(context), player: new QuizClient(context, token) });
    } finally { await context.dispose(); await sandbox.dispose(); }
  },
  hangmanSandbox: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const auth = new AuthClient(context);
      const login = await auth.login(users.registered);
      if (login.status() !== 200) throw new Error(`Login de hangman fallido: ${login.status()}`);
      const { access_token: token } = await login.json();
      await use({ anonymous: new HangmanClient(context), player: new HangmanClient(context, token) });
    } finally { await context.dispose(); await sandbox.dispose(); }
  },
  minesweeperSandbox: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const auth = new AuthClient(context);
      const login = await auth.login(users.registered);
      if (login.status() !== 200) throw new Error(`Login de minesweeper fallido: ${login.status()}`);
      const { access_token: token } = await login.json();
      await use({ anonymous: new MinesweeperClient(context), player: new MinesweeperClient(context, token) });
    } finally { await context.dispose(); await sandbox.dispose(); }
  },
  ticTacToeSandbox: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const auth = new AuthClient(context);
      const credentials = [users.registered, bookReader, users.valid] as const;
      const tokens: string[] = [];
      for (const account of credentials) {
        const login = await auth.login(account);
        if (login.status() !== 200) throw new Error(`Login de tic-tac-toe fallido: ${login.status()}`);
        tokens.push((await login.json()).access_token);
      }
      await use({
        anonymous: new TicTacToeClient(context),
        player: new TicTacToeClient(context, tokens[0]),
        opponent: new TicTacToeClient(context, tokens[1]),
        outsider: new TicTacToeClient(context, tokens[2]),
      });
    } finally { await context.dispose(); await sandbox.dispose(); }
  },
  filesCaptchaSandbox: async ({ playwright }, use) => {
    const sandbox = await startAccountSandbox({ fileFeature: true, captchaFeature: true, captchaSolutionInResponse: true });
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const login = await new AuthClient(context).login(users.registered);
      if (login.status() !== 200) throw new Error(`Login de files/captcha fallido: ${login.status()}`);
      const { access_token: token } = await login.json();
      await use({ files: new FilesClient(context, token), anonymousFiles: new FilesClient(context), captcha: new CaptchaClient(context) });
    } finally { await context.dispose(); await sandbox.dispose(); }
  },
  // eslint-disable-next-line no-empty-pattern -- Playwright requiere desestructurar las dependencias.
  isolatedSocialDatabase: [async ({}, use) => {
    const sandbox = await startAccountSandbox({ socialFeatures: true });
    try { await use(sandbox); } finally { await sandbox.dispose(); }
  }, { scope: 'worker', timeout: 45_000 }],
  commentSandbox: async ({ playwright, isolatedSocialDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedSocialDatabase.baseUrl });
    try {
      const auth = new AuthClient(context);
      const owner = await auth.login(users.registered);
      const other = await auth.login(bookReader);
      if (owner.status() !== 200 || other.status() !== 200) throw new Error('Login de fixture de comentarios falló');
      const ownerToken = (await owner.json()).access_token;
      const otherToken = (await other.json()).access_token;
      await use({ anonymous: new CommentsClient(context), owner: new CommentsClient(context, ownerToken),
        other: new CommentsClient(context, otherToken), articles: new ArticlesClient(context, ownerToken),
        social: new ArticleSocialClient(context, ownerToken), anonymousSocial: new ArticleSocialClient(context),
        otherSocial: new ArticleSocialClient(context, otherToken), socialForToken: (token) => new ArticleSocialClient(context, token),
        users: new UsersClient(context), auth,
        community: new CommunityClient(context, ownerToken), anonymousCommunity: new CommunityClient(context),
        otherCommunity: new CommunityClient(context, otherToken), communityForToken: (token) => new CommunityClient(context, token) });
    } finally { await context.dispose(); }
  },
  paymentCardsSandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      const response = await new AuthClient(context).login(users.registered);
      if (response.status() !== 200) throw new Error(`Login de fixture de tarjetas: HTTP ${response.status()}`);
      await use({
        anonymous: new BookShopPaymentCardsClient(context), invalidToken: new BookShopPaymentCardsClient(context, invalidShopRoleToken),
        withoutAccount: new BookShopPaymentCardsClient(context, (await response.json()).access_token),
        forToken: (token) => new BookShopPaymentCardsClient(context, token),
      });
    } finally { await context.dispose(); }
  },
  shopReportingSandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      const auth = new AuthClient(context);
      const clientFor = async (credentials: typeof bookManager) => {
        const response = await auth.login(credentials);
        if (response.status() !== 200) throw new Error(`Login de reporting: HTTP ${response.status()}`);
        return new BookShopReportingClient(context, (await response.json()).access_token);
      };
      await use({
        clients: {
          anonymous: new BookShopReportingClient(context), invalidToken: new BookShopReportingClient(context, invalidShopRoleToken),
          admin: await clientFor(bookManager), reader: await clientFor(bookReader), staff: await clientFor(bookStaff),
          withoutAccount: await clientFor(users.registered),
        },
        forToken: (token) => new BookShopReportingClient(context, token),
      });
    } finally { await context.dispose(); }
  },
  bookShopRolesSandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      const auth = new AuthClient(context);
      const clientFor = async (credentials: typeof bookManager) => {
        const response = await auth.login(credentials);
        if (response.status() !== 200) throw new Error(`Login de fixture de roles: HTTP ${response.status()}`);
        return new BookShopRolesClient(context, (await response.json()).access_token);
      };
      await use({
        anonymous: new BookShopRolesClient(context), invalidToken: new BookShopRolesClient(context, invalidShopRoleToken),
        admin: await clientFor(bookManager), reader: await clientFor(bookReader),
        staff: await clientFor(bookStaff), withoutAccount: await clientFor(users.registered),
      });
    } finally { await context.dispose(); }
  },
  bookShopOrderStatusesClient: async ({ request }, use) => use(new BookShopOrderStatusesClient(request)),
  orderSandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      const auth = new AuthClient(context);
      const adminToken = (await (await auth.login(bookManager)).json()).access_token;
      const managerToken = (await (await auth.login(bookStaff)).json()).access_token;
      const readerToken = (await (await auth.login(bookReader)).json()).access_token;
      await use({
        anonymousOrderItems: new BookShopOrderItemsClient(context),
        orderItemsForToken: (token) => new BookShopOrderItemsClient(context, token),
        anonymous: new BookShopOrdersClient(context),
        admin: new BookShopOrdersClient(context, adminToken),
        manager: new BookShopOrdersClient(context, managerToken),
        reader: new BookShopOrdersClient(context, readerToken),
        managerAccount: new BookShopAccountsClient(context, managerToken),
        books: new BooksClient(context, adminToken), items: new BookShopItemsClient(context, adminToken),
        users: new UsersClient(context), auth,
        forToken: (token) => new BookShopOrdersClient(context, token),
        accountsForToken: (token) => new BookShopAccountsClient(context, token),
      });
    } finally { await context.dispose(); }
  },
  bookReviewsClient: async ({ request }, use) => use(new BookReviewsClient(request)),
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
  inventorySandbox: async ({ playwright, isolatedAccountDatabase }, use) => {
    const context = await playwright.request.newContext({ baseURL: isolatedAccountDatabase.baseUrl });
    try {
      const auth = new AuthClient(context);
      const managerLogin = await auth.login(bookManager);
      const { access_token: managerToken } = await managerLogin.json();
      const readerLogin = await auth.login(bookReader);
      const { access_token: readerToken } = await readerLogin.json();
      await use({
        anonymous: new BookShopItemsClient(context),
        manager: new BookShopItemsClient(context, managerToken),
        reader: new BookShopItemsClient(context, readerToken),
        books: new BooksClient(context, managerToken),
        users: new UsersClient(context), auth,
        forToken: (token) => new BookShopItemsClient(context, token),
        usersForToken: (token) => new UsersClient(context, token),
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
