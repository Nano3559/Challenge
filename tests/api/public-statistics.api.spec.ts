import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { chartTypes, generatedDayCounts, advancedRoiScenario } from '@src/sut/data/operations';
import { countMapSchema, publicationStatsSchema, userActivitySchema, weatherDataSchema, costDataSchema, articleSchema } from '@src/sut/schemas';

test.describe('Estadísticas, visitas y datos públicos', () => {
  for (const resource of ['users', 'articles']) {
    for (const chartType of chartTypes) {
      test(`${resource}: formato ${chartType}`, { tag: '@regression' }, async ({ operationsClient: client }) => {
        const response = await client.read(`/stats/${resource}`, { chartType });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(Object.keys(body).length).toBeGreaterThan(0);
        expect(body).not.toEqual({});
      });
    }
  }

  for (const resource of ['articles', 'comments']) {
    test(`publicaciones ${resource}: agregaciones de fechas coherentes`, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const response = await client.read(`/stats/publications/${resource}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(publicationStatsSchema, body);
      const sum = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0);
      expect(sum(body.yearly)).toBe(sum(body.monthly));
      expect(sum(body.monthly)).toBe(sum(body.daily));
    });
  }

  test('actividad individual coincide con mapa y agregación diaria/mensual', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const response = await client.read('/stats/activity/user');
    expect(response.status()).toBe(200);
    const all = await response.json();
    const single = await client.read('/stats/activity/user/1');
    expect(single.status()).toBe(200);
    const body = await single.json();
    expectSchema(userActivitySchema, body);
    expect(body).toEqual(all['1']);
    const sum = (map: Record<string, { articles: number; comments: number }>, field: 'articles' | 'comments') => Object.values(map).reduce((total, item) => total + item[field], 0);
    expect(sum(body.userActivityByDay, 'articles')).toBe(sum(body.userActivityByMonth, 'articles'));
    expect(sum(body.userActivityByDay, 'comments')).toBe(sum(body.userActivityByMonth, 'comments'));
    const missing = await client.read('/stats/activity/user/999999');
    expect(missing.status()).toBe(200);
    expect(await missing.json()).toEqual({});
  });

  for (const path of ['/stats/api', '/stats/api/details', '/stats/nonapi', '/stats/nonapi/details']) {
    test(path, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const response = await client.read(path);
      expect(response.status()).toBe(200);
      expectSchema(countMapSchema, await response.json());
    });
  }

  for (const resource of ['articles', 'comments', 'users']) {
    test(`visitas ${resource}: ranking selecciona los mayores contadores`, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const response = await client.read(`/visits/${resource}`);
      const topResponse = await client.read(`/visits/top/${resource}`);
      expect(response.status()).toBe(200);
      expect(topResponse.status()).toBe(200);
      const all = await response.json();
      const top = await topResponse.json();
      expectSchema(countMapSchema, all);
      expectSchema(countMapSchema, top);
      for (const [id, count] of Object.entries(top)) expect(count).toBe(all[id]);
      const counts = Object.values(top) as number[];
      expect([...counts].sort((a, b) => b - a)).toEqual((Object.values(all) as number[]).sort((a, b) => b - a).slice(0, counts.length));
    });
  }

  test('visitas de artículos filtra IDs concretos y omite inexistentes', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const response = await client.read('/visits/articles');
    expect(response.status()).toBe(200);
    const all = await response.json();
    const selected = await client.read('/visits/articles', { ids: '1,2,999999' });
    expect(selected.status()).toBe(200);
    expect(await selected.json()).toEqual({ '1': all['1'], '2': all['2'] });
  });

  for (const resource of ['comments', 'users']) {
    test(`visitas ${resource} acepta el filtro documentado ids`, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const all = await client.read(`/visits/${resource}`);
      expect(all.status()).toBe(200);
      const values = await all.json();
      const ids = Object.keys(values).slice(0, 2);
      const selected = await client.read(`/visits/${resource}`, { ids: [...ids, '999999'].join(',') });
      expect(selected.status()).toBe(200);
      const result = await selected.json();
      expect(Object.keys(result).sort()).toEqual(ids.sort());
      expect(result).toEqual(expect.objectContaining(Object.fromEntries(ids.map((id) => [id, expect.any(Number)]))));
    });
  }

  for (const days of generatedDayCounts) {
    test(`generadores: days=${days}`, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const weatherResponse = await client.read('/v1/data/weather', { days });
      const costResponse = await client.read('/v1/data/costs', { days });
      expect(weatherResponse.status()).toBe(200);
      expect(costResponse.status()).toBe(200);
      const weather = await weatherResponse.json();
      const costs = await costResponse.json();
      expectSchema(weatherDataSchema, weather);
      expectSchema(costDataSchema, costs);
      expect(weather).toHaveLength(Math.min(days, 90));
      expect(costs).toHaveLength(Math.min(days, 90));
      for (const day of costs) {
        expect(day.numberOfTransactions).toBe(day.transactions.length);
        expect(day.dailyBalance).toBe(day.transactions.reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0));
      }
    });
  }

  test('artículo aleatorio corresponde a una consulta existente en copia fresca', { tag: '@regression' }, async ({ freshOperationsClient: client }) => {
    const response = await client.read('/random/article');
    expect(response.status()).toBe(200);
    const article = await response.json();
    expectSchema(articleSchema, article);
    const persisted = await client.read(`/articles/${article.id}`);
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(article);
  });

  test('ROI avanzado reproduce escenario conocido de dos ejecuciones', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const response = await client.calculate('roi', advancedRoiScenario);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.manual.cost.total).toEqual([100, 200]);
    expect(body.automation.cost.total).toEqual([110, 120]);
    expect(body.roi).toBe(80);
  });

  test('ROI simple conserva relación entre beneficios, costos firmados y resultado', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const response = await client.calculate('simpleroi', { numberOfSprints: 2, costPerSprint: 10, benefitPerSprint: 30 });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.totalProfit).toBe(body.totalBenefits + body.totalCosts);
    expect(body.totalCumulativeProfitPerSprint.at(-1)).toBe(body.totalProfit);
    expect(body.profitPerSprint.every((profit: number) => profit === 20)).toBe(true);
  });
});
