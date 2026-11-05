/** Datos estables del dataset por defecto de GAD. */
export type ArticleCreate = {
  title: string;
  body: string;
  date: string;
  image: string;
};

export function buildArticle(): ArticleCreate {
  return {
    title: `Artículo de prueba ${crypto.randomUUID()}`,
    body: 'Contenido creado por la prueba de API.',
    date: '2020-01-01T00:00:00.000Z',
    image: '',
  };
}

export function buildArticleWithoutTitle(): Omit<ArticleCreate, 'title'> {
  const { body, date, image } = buildArticle();
  return { body, date, image };
}

export const knownArticle = {
  id: 1,
  title: 'How to write effective test cases',
  userId: 1,
} as const;

/** Id que no existe en el dataset (para el caso 404). */
export const missingArticleId = 999_999;

/** JSON truncado deliberadamente para comprobar el error del parser. */
export const malformedArticleJson = '{"title":';
