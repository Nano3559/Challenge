import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { healthPaths, expectedGames, missingGameId } from '@src/sut/data/operations';
import { healthSchemas, gameListSchema, scoreListSchema } from '@src/sut/schemas';

test.describe('Salud y catálogos públicos', () => {
  for (const path of healthPaths) {
    test(path, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const response = await client.read(path);
      expect(response.status()).toBe(200);
      expectSchema(healthSchemas[path], await response.json());
    });
  }

  test('ping y metadatos de aplicación', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const ping = await client.read('/ping');
    expect(ping.status()).toBe(200);
    expect(await ping.json()).toEqual({ response: 'pong', status: 'OK' });
    const about = await client.read('/about');
    expect(about.status()).toBe(200);
    expect(await about.json()).toMatchObject({ name: 'GAD', version: expect.any(String), repository: expect.any(String) });
  });

  test('memoria y tiempo activo son coherentes', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const response = await client.read('/health/uptime');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.uptimeTotal.seconds).toBe(body.uptime);
    expect(body.uptimeTotal.minutes).toBeCloseTo(body.uptime / 60);
    const memoryResponse = await client.read('/health/memory');
    expect(memoryResponse.status()).toBe(200);
    const memory = await memoryResponse.json();
    expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);
  });

  test('schema y openapi.json entregan el mismo contrato', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const first = await client.read('/schema');
    const second = await client.read('/openapi.json');
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const schema = await first.json();
    expect(schema).toMatchObject({ openapi: '3.0.1', paths: expect.any(Object), components: expect.any(Object) });
    expect(await second.json()).toEqual(schema);
  });

  for (const path of ['/images/user', '/images/posts']) {
    test(path, { tag: '@regression' }, async ({ operationsClient: client }) => {
      const response = await client.read(path);
      expect(response.status()).toBe(200);
      const images = await response.json();
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBeGreaterThan(0);
      expect(images.every((image: unknown) => typeof image === 'string')).toBe(true);
    });
  }

  test('catálogo de idiomas coincide con traducciones completas e individuales', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const languagesResponse = await client.read('/v1/languages');
    const translationsResponse = await client.read('/v1/languages/translations');
    expect(languagesResponse.status()).toBe(200);
    expect(translationsResponse.status()).toBe(200);
    const languages = await languagesResponse.json();
    const translations = await translationsResponse.json();
    expect(Object.keys(languages).length).toBeGreaterThan(0);
    expect(Object.keys(languages).sort()).toEqual(Object.keys(translations).sort());
    for (const language of Object.keys(languages)) {
      const response = await client.read(`/v1/languages/translations/${language}`);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(translations[language]);
      expect(translations[language]._name).toBe(languages[language]);
    }
    const missing = await client.read('/v1/languages/translations/qa-unknown');
    expect(missing.status()).toBe(200);
    expect(await missing.json()).toEqual({});
  });

  test('juegos y puntuaciones se filtran por game_id', { tag: '@regression' }, async ({ operationsClient: client }) => {
    const gamesResponse = await client.read('/games');
    expect(gamesResponse.status()).toBe(200);
    const games = await gamesResponse.json();
    expectSchema(gameListSchema, games);
    expect(games.map((game: { name: string }) => game.name)).toEqual(expectedGames);
    const scoresResponse = await client.read('/scores');
    expect(scoresResponse.status()).toBe(200);
    const scores = await scoresResponse.json();
    expectSchema(scoreListSchema, scores);
    for (const game of games) {
      const response = await client.read(`/scores/${game.id}`);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(scores.filter((score: { game_id: number }) => score.game_id === game.id));
    }
    const missing = await client.read(`/scores/${missingGameId}`);
    expect(missing.status()).toBe(200);
    expect(await missing.json()).toEqual([]);
  });
});
