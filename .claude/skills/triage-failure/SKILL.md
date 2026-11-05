---
name: triage-failure
description: Analiza fallos de una ejecución (reports/failure-summary.md, trazas) y los clasifica como bug de la app, bug del test, flaky o ambiente. Úsalo cuando fallen tests.
---

# Triage de fallos

1. Lee `reports/failure-summary.md` y `reports/failure-summary.json`. Si no existen, ejecuta el test fallido con `npx playwright test <archivo>`.
2. Para cada fallo abre la evidencia indicada (error-context, screenshot, trace/video) y el código del test.
3. Clasifica con evidencia, sin adivinar:
   - **Bug de la app:** el comportamiento real contradice lo esperado por el requisito.
   - **Bug del test:** locator roto, dato obsoleto, aserción incorrecta, dependencia entre tests.
   - **Flaky:** pasa en reintento; busca esperas, orden o estado compartido.
   - **Ambiente:** URL, credenciales, servicio caído.
4. Responde por cada fallo: causa probable, evidencia, y fix propuesto (diff mínimo). No modifiques `app/`. Si es bug de la app, redacta el reporte del bug (pasos, esperado, real).
5. Si el fix es del test, aplícalo, corre `npm run ci:check` y el test; informa el resultado.
