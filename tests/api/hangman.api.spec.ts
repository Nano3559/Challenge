import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { hangmanHighscoresSchema, hangmanScoreSchema, hangmanWordSchema } from '@src/sut/schemas';

test.describe('API de hangman', () => {
  test('random e highscores son públicos; registrar score requiere autenticación', { tag: '@regression' }, async ({ hangmanSandbox }) => {
    const word = await hangmanSandbox.anonymous.randomWord();
    expect(word.status()).toBe(200);
    const wordBody = await word.json();
    expectSchema(hangmanWordSchema, wordBody);
    expect(wordBody.word).toBe(wordBody.word.toLowerCase());

    const highscores = await hangmanSandbox.anonymous.highscores();
    expect(highscores.status()).toBe(200);
    expectSchema(hangmanHighscoresSchema, await highscores.json());
    const unauthenticated = await hangmanSandbox.anonymous.submitScore({ score: 10 });
    expect(unauthenticated.status()).toBe(401);
  });

  test('puntaje validado y persistido; valores faltantes o no numéricos se rechazan', { tag: '@regression' }, async ({ hangmanSandbox }) => {
    const missing = await hangmanSandbox.player.submitScore({});
    expect(missing.status()).toBe(422);
    const invalid = await hangmanSandbox.player.submitScore({ score: 'invalid' });
    expect(invalid.status()).toBe(422);

    const saved = await hangmanSandbox.player.submitScore({ score: 1000000000 });
    expect(saved.status()).toBe(201);
    expectSchema(hangmanScoreSchema, await saved.json());
    const highscores = await hangmanSandbox.player.highscores();
    expect(highscores.status()).toBe(200);
    expect((await highscores.json()).highScore).toContainEqual(expect.objectContaining({ game: 'Hangman', score: 1000000000 }));
  });
});
