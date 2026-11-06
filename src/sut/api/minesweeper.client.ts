import { BaseApiClient } from '@src/core';

export class MinesweeperClient extends BaseApiClient {
  highscores() { return this.get('/api/minesweeper/highscores'); }
  submitScore(score: unknown) { return this.post('/api/minesweeper/score', score); }
}
