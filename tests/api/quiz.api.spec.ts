import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { quizAnswerResultSchema, quizHighscoresSchema, quizQuestionCountSchema, quizQuestionsSchema } from '@src/sut/schemas';

test.describe('API de quiz', () => {
  test('questions y acciones privadas requieren autenticación; count y highscores son públicos', { tag: '@regression' }, async ({ quizSandbox }) => {
    for (const response of [await quizSandbox.anonymous.questions(), await quizSandbox.anonymous.start(), await quizSandbox.anonymous.stop(), await quizSandbox.anonymous.checkAnswer({ questionText: '', selectedAnswers: [] })]) {
      expect(response.status()).toBe(401);
    }
    const count = await quizSandbox.anonymous.questionCount();
    expect(count.status()).toBe(200);
    expectSchema(quizQuestionCountSchema, await count.json());
    const scores = await quizSandbox.anonymous.highscores();
    expect(scores.status()).toBe(200);
    expectSchema(quizHighscoresSchema, await scores.json());
  });

  test('lista preguntas sin revelar respuestas y el contador coincide', { tag: '@regression' }, async ({ quizSandbox }) => {
    const countResponse = await quizSandbox.player.questionCount();
    expect(countResponse.status()).toBe(200);
    const { count } = await countResponse.json();
    const response = await quizSandbox.player.questions();
    expect(response.status()).toBe(200);
    const questions = await response.json();
    expectSchema(quizQuestionsSchema, questions);
    expect(count).toBeGreaterThanOrEqual(questions.length);
    expect(questions).toHaveLength(10);
    expect(questions.length).toBeGreaterThan(1);
    expect(questions.every((question: object) => !('correctAnswers' in question))).toBe(true);
  });

  test('start, evalúa respuestas, limita a diez, persiste el resultado y lista highscores', { tag: '@regression' }, async ({ quizSandbox }) => {
    const started = await quizSandbox.player.start();
    expect(started.status()).toBe(200);
    expect(await started.json()).toEqual({});

    const correct = await quizSandbox.player.checkAnswer({ questionText: 'What does HTML stand for?', selectedAnswers: ['Hyper Text Markup Language'] });
    expect(correct.status()).toBe(200);
    expectSchema(quizAnswerResultSchema, await correct.json());
    expect(await correct.json()).toMatchObject({ isCorrect: true, score: 1 });
    const incorrect = await quizSandbox.player.checkAnswer({ questionText: 'not a real question', selectedAnswers: ['anything'] });
    expect(incorrect.status()).toBe(200);
    expect(await incorrect.json()).toEqual({ isCorrect: false, score: 1 });

    for (let index = 0; index < 8; index++) {
      const answer = await quizSandbox.player.checkAnswer({ questionText: `unknown-${index}`, selectedAnswers: [] });
      expect(answer.status()).toBe(200);
    }
    const conflict = await quizSandbox.player.checkAnswer({ questionText: 'unknown-final', selectedAnswers: [] });
    expect(conflict.status()).toBe(409);
    expect(await conflict.json()).toMatchObject({ isCorrect: false, score: 1 });

    const stopped = await quizSandbox.player.stop();
    expect([200, 201]).toContain(stopped.status());
    const result = await stopped.json();
    expect(result).toMatchObject({ game_id: expect.any(Number), user_id: expect.any(Number), score: 1 });
    const highscores = await quizSandbox.player.highscores();
    expect(highscores.status()).toBe(200);
    expectSchema(quizHighscoresSchema, await highscores.json());
    expect((await highscores.json()).highScore).toContainEqual(expect.objectContaining({ game: 'Quiz', score: 1 }));

    const replay = await quizSandbox.player.start();
    expect(replay.status()).toBe(200);
    const lowerScoreStop = await quizSandbox.player.stop();
    expect(lowerScoreStop.status()).toBe(200);
    expect((await lowerScoreStop.json()).score).toBe(1);
  });
});
