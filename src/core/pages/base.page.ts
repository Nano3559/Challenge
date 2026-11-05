import { Locator, Page } from '@playwright/test';

/**
 * Page Object base (agnóstico de la app).
 * Las páginas concretas heredan de aquí. Nunca contiene aserciones.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  protected byTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  /** GAD no expone data-testid en todos los controles; usamos ids estables del HTML. */
  protected byId(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  protected byRole(role: Parameters<Page['getByRole']>[0], name?: string | RegExp): Locator {
    return this.page.getByRole(role, name ? { name } : undefined);
  }

  protected byPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }
}
