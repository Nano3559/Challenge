import { test, expect } from '@src/sut/fixtures';
import { users } from '@src/sut/data/users';

test.describe('Login (UI)', () => {
  test('usuario válido llega a la bienvenida', { tag: '@smoke' }, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(users.valid.email, users.valid.password);

    await expect(page).toHaveURL(/\/welcome/);
  });

  test('credenciales inválidas muestran el error', { tag: '@regression' }, async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(users.invalid.email, users.invalid.password);

    await expect(loginPage.errorMessage).toHaveText('Invalid username or password');
  });
});
