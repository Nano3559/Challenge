# Gestión administrativa de cuentas

Verificación local: 2026-11-06. Alcance: GET `/book-shop-manage/accounts` y PATCH `/book-shop-manage/accounts/{id}`. Código de GAD sin cambios.

## Casos implementados

23 pruebas nuevas reutilizando el cliente de reporting, el aislamiento y la preparación de compradores existentes:

- Listado administrativo 200 con esquema Zod estricto: cuenta, usuario, nombre, avatar, rol/nombre de rol y fecha. Se comprueba una cuenta propia creada por el caso.
- Listado y PATCH con anónimo, token inválido, lector y coordinador: 401. Con usuario sin cuenta: 404. Cada intento de PATCH comprueba conservación completa de la cuenta destino.
- Admin asigna cada uno de los cinco roles conocidos sobre una cuenta nueva: 200, persistencia exacta de `role_id` y nombre actualizado en el listado. Se restaura el rol lector en `finally` para no alterar el equipo que verifican otros recursos.
- Ocho cuerpos inválidos: sin `role_id`, null, false, cero, negativo, decimal, ID desconocido y texto no numérico. Respuesta 404 `Role not found`, con cuenta intacta tras cada intento.
- ID de cuenta inexistente, textual inválido y ausente: 404 `Account not found`.
- Campos adicionales de fondos, propietario y favoritos no se aplican; se conserva la cuenta completa cuando se reenvía su rol actual.
- Un comprador no puede ascender su propia cuenta: 401 y cuenta intacta.
- Admin otorga temporalmente rol admin a una cuenta propia nueva; su token existente accede al listado administrativo y estadísticas. Se restaura rol lector y el mismo token vuelve a recibir 401 en ambos recursos.

## Contrato y alcance

Estas dos operaciones existen en el handler, pero no aparecen en el OpenAPI actual. Por tanto sus solicitudes no incrementan directamente métodos/estados/parámetros cubiertos de la especificación, ni se atribuyen a `/book-shop-accounts` por el rewrite interno de GAD. El esquema de pruebas valida la respuesta real, sin inventar un contrato OpenAPI.

La acción `manage-accounts` solo permite rol 1 en el dataset. El coordinador tiene permisos de gestión de pedidos/inventario y consulta de usuarios, pero no de gestión de cuentas. El handler valida sesión y cuenta antes de resolver el permiso.

PATCH solo conserva `role_id` del cuerpo y exige que ese rol exista. No implementa edición administrativa de saldo, dueño o colecciones. No se añadió CRUD inexistente ni se repitieron pruebas de creación de cuenta del recurso anterior.

## Datos y continuidad

Todas las mutaciones se dirigen a compradores/cuentas nuevos en la copia desechable del worker. Las cuentas semilla y sus roles no cambian. Se restaura el rol de las cuentas propias para conservar la coherencia de los listados de equipo durante la regresión; finalmente la copia completa se descarta con sus usuarios y cuentas juntos.

Los defectos previos de pedidos y acceso anónimo al equipo siguen abiertos; esta entrega no modifica GAD. Sin commit nuevo.

## Validación final

- 23/23 pruebas nuevas puntuales y 312/312 API en regresión completa sobre copia desechable.
- Lint, typecheck y git diff --check correctos. Esta entrega afecta exclusivamente API; UI conserva su última validación anterior de 2/2 y no se reejecutó.
- Grabación final: 1838 solicitudes, 1554 reconocidas, 284 sin match.
- Cobertura sin cambios: 232/653 = 35.53%. Endpoints 37/136, operaciones 55/170, estados 151/387, parámetros 26/96; brechas 520, críticas 214.
- Reportes raíz regenerados; estimaciones históricas de IA intactas. Las dos rutas administrativas siguen ausentes de OpenAPI.
- Datos originales de pedidos/inventario/cuentas/historial/roles con SHA-256 antes/después `b779f3b60071f5dfe3235aabb664748e222729838f68e596427c2c7b5ee4b3cc`. Cero carpetas de sandbox al finalizar.
