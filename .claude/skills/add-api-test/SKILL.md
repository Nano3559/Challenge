---
name: add-api-test
description: Agrega una prueba de API al framework siguiendo CLAUDE.md. Úsalo cuando se pida cubrir un endpoint (GET/POST/PUT/DELETE) con tests.
---

# Agregar una prueba de API

1. Lee `CLAUDE.md` (secciones 2-5) y `app/server.js` (o la especificación de la API) para conocer códigos de estado y cuerpos reales.
2. Revisa `tests/api/<recurso>.api.spec.ts` para no duplicar casos.
3. Si falta el método en `src/sut/api/<recurso>.client.ts`, agrégalo extendiendo `BaseApiClient` (sin aserciones).
4. Si falta un esquema de respuesta, agrégalo en `src/sut/schemas/index.ts` (zod). Datos nuevos: `src/sut/data/` (usa/crea builders).
5. Escribe los tests dentro del `describe('<MÉTODO> /ruta')`: caso feliz (`@smoke` solo si es crítico) y error principal (`@regression`). Status primero, luego cuerpo; `expectSchema` para contratos.
6. Ejecuta `npm run ci:check` y `npm run test:api`. No termines hasta que ambos pasen.
7. No modifiques `app/` ni tests existentes. Resume qué agregaste en 3 líneas.
