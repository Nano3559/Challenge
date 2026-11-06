# Cobertura de roles de la tienda

Verificación local: 2026-11-06. Alcance: catálogo `book-shop-roles` y rechazo de sus escrituras. Se conservan el código de GAD, roles semilla y arquitectura existentes.

## Casos implementados

16 pruebas nuevas con cliente, datos, esquema Zod y fixture aislada del SUT:

- Seis consultas del listado: anónimo, administrador de tienda, lector, coordinador de entregas, usuario registrado sin cuenta de tienda y token inválido. Todas devuelven 200 y el mismo catálogo completo.
- Consulta por ID de los cinco roles, contrastando ID y nombre con el catálogo esperado.
- Consulta de ID inexistente: 404 y objeto vacío.
- Ocho rechazos de escritura: POST, PUT, PATCH y DELETE, tanto anónimo como administrador. Todos devuelven 404 y `{ error: { message: 'Not Found' } }`. Se compara el catálogo completo antes y después de cada intento.

Catálogo esperado:

| ID | Nombre |
|---|---|
| 1 | admin |
| 2 | reader |
| 4 | editor |
| 8 | author |
| 16 | delivery-coordinator |

Las escrituras de prueba se dirigen a una copia desechable de db-base mediante el aislamiento existente. El POST intenta un ID propio inexistente; las modificaciones y eliminación apuntan a un rol existente únicamente en esa copia. La comparación posterior comprueba que los intentos rechazados no cambian el catálogo.

## Contrato y permisos

OpenAPI solo documenta GET del listado con 200/404. El handler acepta GET sin exigir token ni rol y rechaza los demás métodos con 404; no existe CRUD administrativo de roles. Un token inválido no impide consultar este catálogo público, lo cual no implica autorización para modificar roles.

GET por ID existe mediante el router genérico, pero no está documentado. Su 404 no cubre el 404 documentado para el listado: ese último no se reproduce con el dataset base y permanece pendiente. Las escrituras rechazadas tampoco se cuentan como métodos documentados de este recurso.

El esquema OpenAPI declara ID como number; el dataset real usa enteros positivos y el esquema del SUT comprueba ese formato. Los roles solo exponen ID y nombre: no contienen listas de permisos. Las decisiones de autorización de libros, inventario, cuentas y pedidos ya se verifican en sus recursos; no se repitieron ni se alteraron asignaciones de roles para simular permisos.

Huella SHA-256 del catálogo de roles de la base habitual antes de la implementación:

`1b83e5d1c1bc5feac87eed5fe67c3f4eafcb653a5b0fe00c3a6b84f15f97dbcb`

## Continuidad

Validación final: 16/16 pruebas nuevas en ejecución puntual; regresión completa 247/247 API y 2/2 UI aprobadas; lint y typecheck sin advertencias; git diff --check correcto. Un primer intento de regresión perdió conexión con la instancia aislada (ECONNREFUSED); su grabación se descartó. La repetición sobre otra copia, fuera del entorno restringido, terminó correctamente.

Grabación final: 1327 solicitudes, 1105 reconocidas y 222 sin match. Cobertura 213/653 = 32.62% (antes 211/653 = 32.31%). Endpoints 32/136, operaciones 50/170, estados 138/387 y parámetros 25/96. Brechas 544, críticas 224. Reportes raíz regenerados, estimaciones IA intactas. El recurso permanece parcial por el 404 pendiente del listado.

El hash del catálogo original coincide con el inicial. Se descartaron las copias desechables, incluida la carpeta abandonada por el intento interrumpido, comprobando primero que no perteneciera a un proceso activo.

El 404 de listado y las discrepancias anteriores de otros recursos permanecen explícitos. No se modificó GAD ni el analizador. Sin commit nuevo.
