---
name: add-page-object
description: Crea un Page Object y su test de UI siguiendo CLAUDE.md. Úsalo cuando se pida automatizar una pantalla o flujo de UI.
---

# Agregar un Page Object y test de UI

1. Lee `CLAUDE.md`. Explora la página real (con el MCP de Playwright si está disponible) para identificar `data-testid` o roles accesibles. Nunca CSS/XPath frágil.
2. Crea `src/sut/pages/<pagina>.page.ts` extendiendo `BasePage` (define `path` y locators con `byTestId`). Sin aserciones.
3. Regístralo en `src/sut/fixtures/index.ts`. Si el flujo necesita sesión, usa login por API (fixture `authenticatedArticlesClient`), no por UI.
4. Crea `tests/ui/<flujo>.ui.spec.ts` con aserciones web-first y tags (`@smoke`/`@regression`).
5. Ejecuta `npm run ci:check` y `npm run test:ui`.
