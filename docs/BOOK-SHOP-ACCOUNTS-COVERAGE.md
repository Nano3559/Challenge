# Cobertura de cuentas de librería

Verificación local: 2026-11-05. Se añadieron 25 tests. Se conserva el GET 200 que ya ejecuta books como auxiliar; no se repite como una nueva tarea.

| Operación | Estados observados | Casos principales |
|---|---|---|
| GET /api/book-shop-accounts | 200 previo, 404 | Sin token, token inválido y usuario sin cuenta |
| POST /api/book-shop-accounts | 201, 401, 409 | Alta aislada con valores iniciales, sin autorización y cuenta duplicada |
| GET /api/book-shop-accounts/my-books | 200, 401, 404 | Colecciones personales, sin autorización y sin cuenta |
| GET /api/book-shop-accounts/{id} | 200, 401, 404 | Propietario, sin autorización, cuenta inexistente y cuenta ajena |
| PATCH /api/book-shop-accounts/{id} | 200, 401, 403, 404 | Dirección persistente, restauración, cuerpo vacío, longitud excesiva, cambio de rol rechazado, cuenta inexistente y ajena |
| POST /api/book-shop-authorize | 200, 401, 403, 404 | Rol permitido, sin filtro, sin token, rol excluido y usuario sin cuenta |

## Aislamiento y restauración

GAD no ofrece DELETE para cuentas de tienda. Eliminar al usuario no garantiza eliminar la cuenta asociada: las referencias usan `user_id` y el borrado genérico no garantiza esa cascada. Por eso el caso 201 no se ejecuta contra la base habitual.

La fixture `accountSandbox` inicia un proceso hijo de GAD con una copia de `db-base.json` dentro de `reports/gad-accounts-*`. El bootstrap `tools/gad/accounts-sandbox.js` cambia únicamente la ruta de base en memoria del hijo; los archivos de GAD permanecen intactos. Usa un puerto libre, verifica el puerto adicional de WebSocket y comunica la URL por IPC. Los módulos ajenos BugHatch y GadTalk se desactivan solo en ese hijo para evitar sus escrituras auxiliares compartidas.

El test crea allí un usuario y su cuenta, valida rol lector, fondos iniciales, colecciones vacías, fecha y persistencia. No borra al propietario por separado: al terminar la fixture detiene el proceso y elimina la copia completa, con ambas entidades juntas. La ruta de eliminación se comprueba dentro de reports antes del borrado recursivo. La inicialización tiene límite de tiempo y también limpia ante un fallo de arranque.

Los casos sin cuenta crean usuarios temporales sin abrirles una cuenta de tienda y los eliminan en finally. La actualización de la cuenta existente guarda una instantánea completa, cambia los cuatro campos de dirección, verifica persistencia y restaura la dirección original en finally; después compara la cuenta completa. Los casos rechazados comprueban conservación del recurso. No cambian fondos, roles ni colecciones base.

Comprobación final: cinco cuentas en la base habitual, cero usuarios temporales y cero directorios de base aislada; dirección del lector restaurada a sus valores originales.

## Diferencias con el OpenAPI

- **GET de cuenta actual sin token:** devuelve 404 con `Not Found`, también con token inválido. El 401 documentado no se reproduce porque la primera validación del handler ya retorna 404. Ese estado permanece abierto.
- **my-books:** devuelve solo las cinco colecciones; no una cuenta completa con id, rol, fondos y fecha como declara la referencia del OpenAPI. Se valida un esquema explícito de colecciones y su coincidencia con la cuenta.
- **Creación:** acepta cuerpo vacío y construye los valores iniciales en servidor, aunque el contrato referencia una cuenta completa como body requerido.
- **PATCH:** admite solo country/city/street/postal_code. No admite los demás campos de cuenta que sugiere el schema del requestBody. Las comprobaciones negativas incluyen el intento de cambiar role_id.
- **Subida de archivos:** se verificó `/api/book-shop-accounts/files` con multipart real, con token de lector y sin token. Ambas solicitudes devuelven 404 con `Not Found`; no hay una rama de subida implementada en el handler. No se añadieron expectativas 200/401 que GAD no cumple, ni archivos persistentes. La operación permanece sin cobertura.
- Las colecciones pueden contener strings numéricos, como ya se documentó en books; el esquema real lo admite explícitamente.

## Validación final

- **127/127 API**: 25 casos nuevos y 102 existentes.
- **2/2 UI**, lint y typecheck correctos; diff sin errores de whitespace.
- **476 solicitudes**, 412 reconocidas y 64 sin match, sin cambios respecto a las rutas no documentadas previas.
- Cobertura global: **134/653 = 20.52%**, antes 109/653 = 16.69%.
- Endpoints 18/136; operaciones 31/170; estados 86/387; parámetros 17/96.
- Brechas **637**, antes 665; críticas **257**, antes 265.

La grabación agrega tráfico real de la instancia habitual y de la copia aislada de la misma versión de GAD. La medición incluye preparación y restauración; las estimaciones IA del baseline conservan sus valores históricos del Día 1. No se modificó el analizador ni el OpenAPI para cerrar discrepancias artificialmente.
