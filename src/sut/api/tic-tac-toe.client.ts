import { BaseApiClient } from '@src/core';

export class TicTacToeClient extends BaseApiClient {
  highscores() { return this.get('/api/tic-tac-toe/highscores'); }
  start() { return this.post('/api/tic-tac-toe/start', {}); }
  join(code?: string) { return this.post('/api/tic-tac-toe/join', code === undefined ? {} : { code }); }
  status(code: string) { return this.get(`/api/tic-tac-toe/status/${encodeURIComponent(code)}`); }
  move(code: string, move: readonly number[]) { return this.post('/api/tic-tac-toe/status', { code, move }); }
  stop(code?: string) { return this.post('/api/tic-tac-toe/stop', code === undefined ? {} : { code }); }
}
