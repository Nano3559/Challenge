import { BasePage } from '@src/core';

export class LoginPage extends BasePage {
  protected readonly path = '/login';

  // En GAD #username también existe en el header (dropdown), por eso usamos roles/labels.
  readonly usernameInput = this.byRole('textbox', 'Enter User Email');
  readonly passwordInput = this.byPlaceholder('Enter Password');
  readonly submitButton = this.byRole('button', 'LogIn');
  readonly errorMessage = this.byTestId('login-error');

  async login(email: string, password: string) {
    await this.usernameInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
