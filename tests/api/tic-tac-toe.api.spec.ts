import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { ticTacToeHighscoresSchema, ticTacToeSessionSchema } from '@src/sut/schemas';

test.describe('API de tic-tac-toe', () => {
  test('highscores público y operaciones de sesión protegidas', { tag: '@regression' }, async ({ ticTacToeSandbox }) => {
    const highscores = await ticTacToeSandbox.anonymous.highscores();
    expect(highscores.status()).toBe(200);
    expectSchema(ticTacToeHighscoresSchema, await highscores.json());

    const responses = [
      await ticTacToeSandbox.anonymous.start(),
      await ticTacToeSandbox.anonymous.join('ABCD'),
      await ticTacToeSandbox.anonymous.status('ABCD'),
      await ticTacToeSandbox.anonymous.move('ABCD', [0, 0]),
      await ticTacToeSandbox.anonymous.stop('ABCD'),
    ];
    for (const response of responses) expect(response.status()).toBe(401);
  });

  test('crea y une una partida, valida turnos, gana, consulta estado y detiene', { tag: '@regression' }, async ({ ticTacToeSandbox: game }) => {
    const started = await game.player.start();
    expect(started.status()).toBe(201);
    const initial = await started.json();
    expectSchema(ticTacToeSessionSchema, initial);
    expect(initial).toMatchObject({ hasStarted: false, hasEnded: false, currentTurn: 0 });

    const missingCode = await game.opponent.join();
    expect(missingCode.status()).toBe(403);
    const missingSession = await game.opponent.join('NOPE');
    expect(missingSession.status()).toBe(422);
    const missingMoveCode = await game.player.move('', [0, 0]);
    expect(missingMoveCode.status()).toBe(422);
    const missingStopCode = await game.player.stop();
    expect(missingStopCode.status()).toBe(403);

    const joined = await game.opponent.join(initial.code);
    expect(joined.status()).toBe(200);
    expectSchema(ticTacToeSessionSchema, await joined.json());
    expect((await joined.json()).hasStarted).toBe(true);

    const privateStatus = await game.outsider.status(initial.code);
    expect(privateStatus.status()).toBe(401);
    const unknownStatus = await game.player.status('NOPE');
    expect(unknownStatus.status()).toBe(404);
    const current = await game.player.status(initial.code);
    expect(current.status()).toBe(200);
    expectSchema(ticTacToeSessionSchema, await current.json());

    const wrongTurn = await game.opponent.move(initial.code, [0, 1]);
    expect(wrongTurn.status()).toBe(422);
    const moves = [
      [game.player, [0, 0]], [game.opponent, [0, 1]],
      [game.player, [1, 0]], [game.opponent, [1, 1]], [game.player, [2, 0]],
    ] as const;
    let finalState;
    for (const [client, move] of moves) {
      const response = await client.move(initial.code, move);
      expect(response.status()).toBe(200);
      finalState = await response.json();
      expectSchema(ticTacToeSessionSchema, finalState);
    }
    expect(finalState).toMatchObject({ hasEnded: true, currentTurn: 5, numberOfMatches: 1, scores: { '0': 1, '1': 0 } });

    const stopped = await game.opponent.stop(initial.code);
    expect(stopped.status()).toBe(200);
    expectSchema(ticTacToeSessionSchema, await stopped.json());
    expect((await stopped.json()).hasEnded).toBe(true);
  });
});
