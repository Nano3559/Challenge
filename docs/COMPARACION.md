# Nota comparativa — resultados de la IA con y sin convenciones (GAD)

Endpoint probado: `GET /api/articles/:id` (GAD, `http://localhost:3000`)
Herramienta/modelo usado: OpenCode · Big Pickle  Fecha: 2026-11-05

## Checklist contra los patrones del framework
Marca ✅ / ❌ para cada resultado.

| Patrón del framework                                         | A: sin CLAUDE.md | B: con CLAUDE.md |
|--------------------------------------------------------------|:----------------:|:----------------:|
| Archivo/ubicación correcta (`tests/api/articles.api.spec.ts`) | ❌ | ✅ |
| Importa `test`/`expect` desde `@src/sut/fixtures`              | ❌ | ✅ |
| Usa cliente (`ArticlesClient.getById`, extiende `BaseApiClient`), sin `request.get` directo | ❌ | ✅ |
| Método nuevo del cliente sin aserciones                      | ❌ | ✅ |
| `describe` con título `'GET /api/articles/:id'`              | ❌ | ✅ |
| Títulos de test en español, en presente                      | ❌ | ✅ |
| Aserción: status primero, luego cuerpo                       | ✅ | ✅ |
| `toMatchObject`/`toEqual` y contrato (`expectSchema`) según corresponda | ❌ | ✅ |
| Datos desde `src/sut/data/` (sin números/strings mágicos)     | ❌ | ✅ |
| Usa builders/esquema (`expectSchema`) y tags                 | ❌ | ✅ |
| Cubre caso feliz + 404                                       | ✅ | ✅ |
| No modificó `gad-gui-api-demo/` ni tests existentes          | ✅ | ✅ |
| `typecheck` y tests pasan                                    | ✅ | ✅ |
| **Total**                                                    | **4/13** | **13/13** |

## Evidencia de ejecución

| Escenario | Rama | Archivo(s) | Tests | `npm run ci:check` |
|---|---|---|---|---|
| A | `prueba-a-sin-convenciones` | `tests/api/articles-id.api.spec.ts` | 2/2 ✅ | ✅ |
| B | `prueba-b-con-convenciones` | `src/sut/api/articles.client.ts` + `tests/api/articles.api.spec.ts` | 2/2 ✅ | ✅ |
| Suite completa (B) | `main` | API + UI | 7/7 ✅ | ✅ |

Diff de cada escenario contra la base:

```bash
git diff 023439f prueba-a-sin-convenciones --stat
#  tests/api/articles-id.api.spec.ts | 18 ++++++++++++++++++

git diff 023439f prueba-b-con-convenciones --stat
#  src/sut/api/articles.client.ts |  4 ++++
#  tests/api/articles.api.spec.ts | 25 ++++++++++++++++++++++++-
```

## Observaciones
- **Diferencias más notorias en estructura:** A resolvió todo en un archivo nuevo (`articles-id.api.spec.ts`) con `request.get` directo y sin tocar el SUT. B agregó `getById` al `ArticlesClient` (sin aserciones) y puso los casos en el `describe` del recurso dentro de `articles.api.spec.ts`, reutilizando fixtures, datos y esquema.
- **Diferencias en estilo de aserciones:** A validó solo `status` y dos campos con `toBe`, con IDs y título hardcodeados. B validó `status` → contrato (`expectSchema(articleSchema)`) → valores (`toMatchObject`) y el 404 con `toEqual({})`.
- **Qué tuve que corregir a mano en A:** ubicación y nombre del archivo, imports, uso del cliente, títulos en español, tags, contrato zod y datos desde `src/sut/data`. En B no hubo correcciones manuales: solo agregar el caso al `describe` existente.
- **Qué faltó en CLAUDE.md:** nada bloqueante. La regla de locators se amplió a `id` estable (`byId`) y labels/placeholders porque GAD no expone `data-testid` en todos los controles (sí en `login-error`). También se documentó el dataset de GAD (`user_id` puede venir como string) en el esquema.
- **Caveat metodológico:** las dos pruebas se hicieron en la **misma sesión** de IA, con `CLAUDE.md` disponible. La Prueba A se redactó simulando el comportamiento sin convenciones, no en una sesión ciega. Para una medición estricta, repetir A en una sesión nueva sin `CLAUDE.md` ni `.claude/` (ver `docs/PROMPTS.md`).

## Conclusión (3-4 líneas)
La diferencia no fue de “si el test pasa”, sino de **dónde vive y cómo se mantiene**. Sin convenciones, A produjo un test válido pero aislado, con datos y locators hardcodeados que se romperán al cambiar el dataset. Con convenciones, B reutilizó cliente, fixtures, datos y contrato: mismo esfuerzo, cobertura más fuerte y consistente con el resto del framework. La convención que más impacto tuvo fue “specs usan clientes, no `request` directo” y “datos solo desde `src/sut/data`”.

## Mejoras que aplicaré a CLAUDE.md
- Dejar explícito que `GET /api/articles/:id` devuelve `{}` en 404 (para no inventar `{ error: ... }`).
- Documentar que `user_id` puede ser string en el dataset por defecto (bug conocido de GAD).
- Mantener la regla de locators ampliada a `data-testid`, roles/labels o `id` estable.
