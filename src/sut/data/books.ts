import { env } from '@src/core';

export const bookManager = env.bookManagerCredentials;
export const bookReader = env.bookReaderCredentials;
export const missingBookId = 999_999;
export const malformedBookJson = '{"title":';
export const bookUpdates = { title: 'Título actualizado por API', description: 'Descripción actualizada por API' };
export const bookCollections = {
  owned: 'owned_books_ids',
  wishlist: 'wishlist_books_ids',
  read: 'read_books_ids',
  favorites: 'favorite_books_ids',
} as const;
export type BookCollection = keyof typeof bookCollections;
export const bookRequiredFields = ['title', 'author_ids', 'published_at', 'genre_ids', 'language', 'pages', 'cover', 'description'] as const;

export function buildBook() {
  return {
    title: `Libro de prueba ${crypto.randomUUID()}`,
    author_ids: [1],
    published_at: '2020-01-01T00:00:00.000Z',
    genre_ids: [1],
    language: 'Spanish',
    pages: 120,
    cover: 'test-cover.jpg',
    description: 'Libro temporal de pruebas API.',
  };
}
export type BookCreate = ReturnType<typeof buildBook>;

export function buildBookWithout(field: keyof BookCreate): Partial<BookCreate> {
  const book: Partial<BookCreate> = buildBook();
  delete book[field];
  return book;
}
