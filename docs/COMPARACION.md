# Nota comparativa — resultados de la IA con y sin convenciones (GAD)

Endpoint probado: `GET /api/articles/:id` (GAD, `http://localhost:3000`)
Herramienta/modelo usado: _______________  Fecha: __________

## Checklist contra los patrones del framework
Marca ✅ / ❌ para cada resultado.

| Patrón del framework                                         | A: sin CLAUDE.md | B: con CLAUDE.md |
|--------------------------------------------------------------|:----------------:|:----------------:|
| Archivo/ubicación correcta (`tests/api/articles.api.spec.ts`) |                  |                  |
| Importa `test`/`expect` desde `@src/sut/fixtures`              |                  |                  |
| Usa cliente (`ArticlesClient.getById`, extiende `BaseApiClient`), sin `request.get` directo | |                  |
| Método nuevo del cliente sin aserciones                      |                  |                  |
| `describe` con título `'GET /api/articles/:id'`              |                  |                  |
| Títulos de test en español, en presente                      |                  |                  |
| Aserción: status primero, luego cuerpo                       |                  |                  |
| `toMatchObject`/`toEqual` y contrato (`expectSchema`) según corresponda |          |                  |
| Datos desde `src/sut/data/` (sin números/strings mágicos)     |                  |                  |
| Usa builders/esquema (`expectSchema`) y tags                 |                  |                  |
| Cubre caso feliz + 404                                       |                  |                  |
| No modificó `gad-gui-api-demo/` ni tests existentes          |                  |                  |
| `typecheck` y tests pasan                                    |                  |                  |
| **Total**                                                    |       /13        |       /13        |

## Observaciones
- Diferencias más notorias en estructura:
- Diferencias en estilo de aserciones:
- ¿Qué tuve que corregir a mano en A? ¿Y en B?
- ¿Qué faltó en CLAUDE.md (algo que la IA siguió haciendo mal incluso con el archivo)?

## Conclusión (3-4 líneas)

## Mejoras que aplicaré a CLAUDE.md
-
