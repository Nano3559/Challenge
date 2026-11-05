/** Datos estables del dataset por defecto de GAD. */
export const knownArticle = {
  id: 1,
  title: 'How to write effective test cases',
  userId: 1,
} as const;

/** Id que no existe en el dataset (para el caso 404). */
export const missingArticleId = 999_999;
