import { BaseApiClient } from '@src/core';

export class QuizClient extends BaseApiClient {
  questions() { return this.get('/api/quiz/questions'); }
  questionCount() { return this.get('/api/quiz/questions/count'); }
  start() { return this.get('/api/quiz/start'); }
  stop() { return this.get('/api/quiz/stop'); }
  highscores() { return this.get('/api/quiz/highscores'); }
  checkAnswer(data: { questionText: string; selectedAnswers: string[] }) { return this.post('/api/quiz/questions/check', data); }
}
