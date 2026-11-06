import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { minesweeperHighscoresSchema, minesweeperScoreSchema } from '@src/sut/schemas';

test.describe('API de minesweeper', () => {
  test('highscores es público y el registro de score requiere autenticación', { tag: '@regression' }, async ({ minesweeperSandbox }) => {
    const highscores = await minesweeperSandbox.anonymous.highscores();
    expect(highscores.status()).toBe(200);
    expectSchema(minesweeperHighscoresSchema, await highscores.json());
    const unauthorized = await minesweeperSandbox.anonymous.submitScore({ score: 10 });
    expect(unauthorized.status()).toBe(401);
  });

  test('valida el score y publica el puntaje registrado en highscores', { tag: '@regression' }, async ({ minesweeperSandbox }) => {
    const missing = await minesweeperSandbox.player.submitScore({});
    expect(missing.status()).toBe(422);
    const invalid = await minesweeperSandbox.player.submitScore({ score: 'invalid' });
    expect(invalid.status()).toBe(422);

    const saved = await minesweeperSandbox.player.submitScore({ score: 1000000000 });
    expect(saved.status()).toBe(201);
    expectSchema(minesweeperScoreSchema, await saved.json());
    const lower = await minesweeperSandbox.player.submitScore({ score: 0 });
    expect(lower.status()).toBe(200);
    expectSchema(minesweeperScoreSchema, await lower.json());
    expect(await lower.json()).toMatchObject({ score: 0 });
    const highscores = await minesweeperSandbox.player.highscores();
    expect(highscores.status()).toBe(200);
    expect((await highscores.json()).highScore).toContainEqual(expect.objectContaining({ game: 'Minesweeper', score: 1000000000 }));
  });
});
