# Prompts para el experimento del Día 1 (adaptado a GAD)

Endpoint sin prueba: **`GET /api/articles/:id`** (200 con el artículo, 404 si no existe).
El recurso de GAD es `articles`; el cliente `ArticlesClient` ya existe pero **no** tiene `getById`.

## Preparación
1. Haz un commit limpio del framework adaptado (`git init && git add . && git commit -m "framework base GAD"`).
2. Para la **Prueba A**, retira el archivo de convenciones Y las skills/agentes (también guían a la IA):
   `mkdir /tmp/ia && mv CLAUDE.md .claude /tmp/ia/` y usa una sesión nueva (sin contexto previo).
3. Guarda el resultado de cada prueba en una rama o carpeta distinta (`git switch -c prueba-a-sin-convenciones`).

## Prueba A — SIN convenciones
Prompt (en sesión nueva, con acceso al repo pero sin CLAUDE.md):
> Agrega una prueba automatizada para el endpoint GET /api/articles/:id de GAD (http://localhost:3000).

## Prueba B — CON convenciones
Restaura (`mv /tmp/ia/CLAUDE.md /tmp/ia/.claude .`), vuelve a `main`, sesión nueva:
> Agrega una prueba automatizada para el endpoint GET /api/articles/:id de GAD (http://localhost:3000).
> Sigue las convenciones de CLAUDE.md.

(El prompt debe ser idéntico salvo por la última línea / la presencia del archivo.)

## Después
Opcional, Prueba C: con CLAUDE.md + skill `add-api-test` (pide: "usa la skill add-api-test para GET /api/articles/:id").
Rellena `docs/COMPARACION.md` con lo que observes. Usa `git diff main` en cada rama.
