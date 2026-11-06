import { BaseApiClient } from '@src/core';

export class HangmanClient extends BaseApiClient {
  randomWord() { return this.get('/api/hangman/random'); }
  highscores() { return this.get('/api/hangman/highscores'); }
  submitScore(score: unknown) { return this.post('/api/hangman/score', score); }
}
