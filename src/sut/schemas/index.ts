import { z } from 'zod';

export const bookAuthorSchema = z.object({
  id: z.number(), name: z.string(), country: z.string(),
});
export const bookAuthorListSchema = z.array(bookAuthorSchema);
export const bookGenreSchema = z.object({ id: z.number(), name: z.string() });
export const bookGenreListSchema = z.array(bookGenreSchema);

export const bookSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  author_ids: z.array(z.number().int()),
  published_at: z.string(),
  genre_ids: z.array(z.number().int()),
  language: z.string(),
  pages: z.number().int(),
  cover: z.string(),
  description: z.string(),
});
export const bookListSchema = z.array(bookSchema);
const collectionIds = z.array(z.union([z.number().int(), z.string().regex(/^\d+$/)]));
export const bookShopAccountSchema = z.object({
  id: z.number().int(), user_id: z.number().int(), role_id: z.number().int(),
  funds: z.number().int(), created_at: z.string(),
  wishlist_books_ids: collectionIds, owned_books_ids: collectionIds,
  read_books_ids: collectionIds, favorite_books_ids: collectionIds, purchased_book_ids: collectionIds,
});
export const bookCollectionsSchema = bookShopAccountSchema.pick({
  wishlist_books_ids: true, owned_books_ids: true, read_books_ids: true,
  favorite_books_ids: true, purchased_book_ids: true,
});
export const bookShopAuthorizationSchema = bookShopAccountSchema.pick({ id: true, user_id: true, role_id: true });

export const userSchema = z.object({
  id: z.union([z.number(), z.string()]),
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  avatar: z.string(),
  password: z.string().optional(),
});
// Las lecturas API sin sesión de navegador reciben la proyección pública de GAD.
export const publicUserSchema = userSchema.extend({
  email: z.literal('****'),
  lastname: z.literal('****'),
  password: z.literal('****'),
});
export const userListSchema = z.array(publicUserSchema);

export const articleSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
  // GAD tiene un registro con user_id string ('3') en el dataset por defecto.
  user_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  date: z.string().min(1),
  image: z.string(),
});

export const articleListSchema = z.array(articleSchema);

export const loginResponseSchema = z.object({
  access_token: z.string().min(10),
});

// GET /api/login sin el header verbose devuelve un objeto vacío.
export const tokenValidationResponseSchema = z.strictObject({});

export const loginErrorSchema = z.object({
  status: z.number().int(),
  message: z.string().min(1),
});
