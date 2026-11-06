import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import {
  diagnosticLogsSchema, logLevelResponseSchema, restoreListSchema, restoreResultSchema,
  toggleDiagnosticsSchema, toggleLogsSchema, toggleMetricsSchema,
} from '@src/sut/schemas';

test.describe('API de diagnósticos y restauración aislada', () => {
  test('alterna diagnósticos, logs y métricas; configura nivel y consulta histogramas', { tag: '@regression' }, async ({ isolatedOperationsClient: client }) => {
    const initialLogs = await client.read('/logs');
    expect(initialLogs.status()).toBe(200);
    expect(await initialLogs.json()).toEqual({});

    const diagnosticsOn = await client.read('/diagnostic/toggle-diagnostics');
    expect(diagnosticsOn.status()).toBe(200);
    expectSchema(toggleDiagnosticsSchema, await diagnosticsOn.json());
    expect(await diagnosticsOn.json()).toEqual({ diagnosticsEnabled: true, logsEnabled: true });

    const logsOn = await client.read('/logs');
    expect(logsOn.status()).toBe(200);
    const logs = await logsOn.json();
    expectSchema(diagnosticLogsSchema, logs);
    expect(logs.logs.itemCount).toBeGreaterThan(0);
    // No imprimir ni afirmar el contenido: puede incluir datos de solicitudes registrados por el servidor.

    const histogram = await client.read('/diagnostic/request/histogram');
    expect(histogram.status()).toBe(200);
    expect(typeof await histogram.json()).toBe('object');

    const logsOff = await client.read('/diagnostic/toggle-logs');
    expect(logsOff.status()).toBe(200);
    expectSchema(toggleLogsSchema, await logsOff.json());
    expect(await logsOff.json()).toEqual({ logsEnabled: false });
    expect(await (await client.read('/logs')).json()).toEqual({});

    const metricsOn = await client.read('/diagnostic/toggle-metrics');
    expect(metricsOn.status()).toBe(200);
    expectSchema(toggleMetricsSchema, await metricsOn.json());
    expect(await metricsOn.json()).toEqual({ metricsTrackingEnabled: true });
    const metricsOff = await client.read('/diagnostic/toggle-metrics');
    expect(metricsOff.status()).toBe(200);
    expect(await metricsOff.json()).toEqual({ metricsTrackingEnabled: false });

    const missingLevel = await client.setLogLevel();
    expect(missingLevel.status()).toBe(400);
    const level = await client.setLogLevel('2');
    expect(level.status()).toBe(200);
    expectSchema(logLevelResponseSchema, await level.json());
    expect(await level.json()).toEqual({ level: '2' });

    const diagnosticsOff = await client.read('/diagnostic/toggle-diagnostics');
    expect(diagnosticsOff.status()).toBe(200);
    expect(await diagnosticsOff.json()).toEqual({ diagnosticsEnabled: false, logsEnabled: true });
  });

  test('restore/list informa los perfiles disponibles en el proceso aislado', { tag: '@regression' }, async ({ isolatedOperationsClient: client }) => {
    const response = await client.read('/restore/list');
    expect(response.status()).toBe(201);
    expectSchema(restoreListSchema, await response.json());
    const { dbRestoreList } = await response.json();
    expect(dbRestoreList.map((entry: { name: string }) => entry.name)).toEqual(expect.arrayContaining([
      'restoreDB', 'restoreBigDB', 'restoreEmptyDB',
    ]));
  });

  for (const path of ['/restoreDB', '/restoreBigDB', '/restoreEmptyDB']) {
    test(`${path} reemplaza solo el estado en memoria de su sandbox`, { tag: '@regression' }, async ({ isolatedOperationsClient: client }) => {
      const response = await client.read(path);
      expect(response.status()).toBe(201);
      expectSchema(restoreResultSchema, await response.json());
      expect((await response.json()).entities).toBeDefined();
    });
  }

  for (const path of ['/debug/exit', '/debug/restart']) {
    test(`${path} responde y termina únicamente su proceso desechable`, { tag: '@regression' }, async ({ isolatedOperationsClient: client }) => {
      const response = await client.read(path);
      expect(response.status()).toBe(200);
    });
  }
});
