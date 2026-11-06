export const missingCommentId = 999_999;
export const updatedCommentBody = 'Comentario actualizado por la prueba.';
export function buildComment(articleId: number) {
  return { article_id: articleId, body: `Comentario ${crypto.randomUUID()}`, date: '2020-01-01T00:00:00.000Z' };
}
export const invalidCommentPayloads: Record<string, unknown>[] = [
  {}, { body: '' }, { date: 'qa-invalid' }, { unexpected: 'qa' },
];
