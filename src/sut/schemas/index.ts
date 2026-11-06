import { z } from 'zod';

export const bookShopOrderSchema = z.object({
  id: z.number().int(), user_id: z.number().int(), status_id: z.number().int(),
  book_ids: z.array(z.number().int()), books_cost: z.record(z.string(), z.number().int()),
  partial_costs: z.record(z.string(), z.number().int()), total_cost: z.number().int().nonnegative(),
  created_at: z.string().datetime({ offset: true }),
});
export const bookShopOrderListSchema = z.array(bookShopOrderSchema);

export const bookReviewSchema = z.object({
  id: z.number().int(), book_id: z.number().int(), user_id: z.number().int(),
  rating: z.number().int(), content: z.string(), created_at: z.string().datetime({ offset: true }),
  author: z.literal('Anonymous'),
});
export const bookReviewListSchema = z.array(bookReviewSchema);
export const bookReviewStatsSchema = z.object({
  book_id: z.string().regex(/^\d+$/), mean: z.number(), numberOfReviews: z.number().int().nonnegative(),
});
export const bookReviewStatsListSchema = z.array(bookReviewStatsSchema);

export const bookShopItemSchema = z.object({
  id: z.number().int(), book_id: z.number().int(), price: z.number(),
  quantity: z.number().int(), created_at: z.string().datetime({ offset: true }),
});
export const bookShopItemListSchema = z.array(bookShopItemSchema);

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
const applicationStatus = z.enum(['OK', 'Limited', 'Degraded', 'Maintenance', 'Critical', 'Down']);
const memoryMetrics = {
  rss: z.number().positive(), heapTotal: z.number().nonnegative(), heapUsed: z.number().nonnegative(),
  external: z.number().nonnegative(), arrayBuffers: z.number().nonnegative(),
};
const uptimeMetrics = {
  uptime: z.number().nonnegative(),
  uptimeTotal: z.object({ seconds: z.number().nonnegative(), minutes: z.number().nonnegative(), hours: z.number().nonnegative(), days: z.number().nonnegative() }),
  processtime: z.tuple([z.number(), z.number()]),
};
export const healthSchemas = {
  '/health': z.object({ status: applicationStatus, health: z.object({ ...uptimeMetrics, timestamp: z.number().positive(), date: z.string().datetime(), memoryUsageMB: z.object(memoryMetrics) }), dbProblems: z.array(z.unknown()), configProblems: z.array(z.unknown()), backendProblems: z.array(z.unknown()) }),
  '/health/configcheck': z.object({ status: applicationStatus }),
  '/health/dbcheck': z.object({ status: applicationStatus, result: z.object({ isOk: z.boolean() }) }),
  '/health/db': z.object({ status: applicationStatus, entities: z.record(z.string(), z.number().int().nonnegative()) }),
  '/health/memory': z.object({ status: applicationStatus, ...memoryMetrics }),
  '/health/uptime': z.object({ status: applicationStatus, ...uptimeMetrics }),
};
export const gameListSchema = z.array(z.object({ id: z.number().int(), name: z.string() }));
export const scoreListSchema = z.array(z.object({ id: z.number().int(), game_id: z.number().int(), user_id: z.union([z.number().int(), z.string()]), score: z.number() }));
export const countMapSchema = z.record(z.string(), z.number().int().nonnegative());
export const publicationStatsSchema = z.object({ yearly: countMapSchema, monthly: countMapSchema, daily: countMapSchema });
const activityCounts = z.object({ articles: z.number().int().nonnegative(), comments: z.number().int().nonnegative() });
export const userActivitySchema = z.object({
  user: z.object({ id: z.number().int(), name: z.string() }),
  userActivityByDay: z.record(z.string(), activityCounts), userActivityByMonth: z.record(z.string(), activityCounts),
  userActivityByYear: z.record(z.string(), activityCounts.extend({ total: z.number().int().nonnegative() })),
});
export const weatherDataSchema = z.array(z.object({ date: z.string(), weather: z.string(), temperatureRaw: z.number(), highLowTemperature: z.object({ temperatureHigh: z.number(), temperatureLow: z.number() }) }));
export const costDataSchema = z.array(z.object({ date: z.string(), numberOfTransactions: z.number().int().nonnegative(), dailyBalance: z.number(), transactions: z.array(z.object({ amount: z.number(), category: z.object({ name: z.string(), index: z.number().int(), emoji: z.string() }) })) }));
export const flashpostSchema = z.object({ id: z.number().int(), user_id: z.number().int(), body: z.string(), date: z.string().datetime({ offset: true }), settings: z.object({ color: z.string().optional() }), is_public: z.boolean().optional() });
export const messageSchema = z.object({ id: z.number().int(), from: z.number().int(), to: z.union([z.number().int(), z.string()]), content: z.string(), date: z.string().datetime({ offset: true }) });
export const surveyResponseSchema = z.object({ id: z.number().int(), user_id: z.union([z.number().int(), z.string()]), type: z.union([z.number().int(), z.string()]), date: z.string().datetime({ offset: true }), answers: z.record(z.string(), z.unknown()) });
export const commentSchema = z.object({
  id: z.union([z.number().int(), z.string()]), article_id: z.union([z.number().int(), z.string()]),
  user_id: z.union([z.number().int(), z.string()]), body: z.string(), date: z.string().datetime({ offset: true }),
});
export const commentListSchema = z.array(commentSchema);
export const labelListSchema = z.array(z.object({ id: z.number().int(), name: z.string(), user_id: z.union([z.number().int(), z.string()]) }));
export const articleLabelSchema = z.object({ id: z.number().int(), article_id: z.number().int(), label_ids: z.array(z.number().int()) });
export const likeCountSchema = z.object({ likes: z.number().int().nonnegative() });
export const bookmarkSchema = z.object({ id: z.number().int(), user_id: z.number().int(), article_ids: z.array(z.number().int()) });
export const paymentCardUpdateResponseSchema = z.object({
  account_id: z.number().int().positive(), card_number: z.string().regex(/^\d{20}$/),
  cvv: z.string().regex(/^\d{5}$/), expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  balance: z.number().int().nonnegative(),
});
export const paymentCardSchema = paymentCardUpdateResponseSchema.extend({ id: z.number().int().positive() });
export const maskedPaymentCardSchema = z.strictObject({
  card_number: z.string().regex(/^\*{16}\d{4}$/), balance: z.number().int().nonnegative(),
});
export const managedShopAccountListSchema = z.array(z.strictObject({
  id: z.number().int().positive(), user_id: z.number().int().positive(), user_name: z.string().min(1),
  avatar: z.string(), role_id: z.number().int().positive(), role_name: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
}));
const shopCount = z.number().int().nonnegative();
const shopTotals = z.object({ totalOrders: shopCount, totalBooks: shopCount, totalBooksSold: shopCount, totalCost: shopCount });
const shopOrderMetrics = z.object({
  totalPartialCosts: z.record(z.string(), shopCount), totalBooksPerType: z.record(z.string(), shopCount),
  totalStatusesPerType: z.record(z.string(), shopCount),
});
const shopUserMetrics = z.object({
  totalItems: shopCount, costsPerUser: z.record(z.string(), shopCount), booksPerUser: z.record(z.string(), shopCount),
  booksPerUserPerOrderStatus: z.record(z.string(), z.record(z.string(), shopCount)),
});
const shopItemMetrics = z.object({
  totalItems: shopCount, totalItemsPerPrice: z.record(z.string(), shopCount), totalItemsPerQuantity: z.record(z.string(), shopCount),
});
export const shopStatsSchemas = {
  orders: shopTotals.extend(shopOrderMetrics.shape), users: shopTotals.extend(shopUserMetrics.shape),
  items: shopTotals.extend(shopItemMetrics.shape),
  all: shopTotals.extend(shopOrderMetrics.shape).extend(shopUserMetrics.shape).extend(shopItemMetrics.shape),
};
export const shopPaymentHistorySchema = z.array(z.object({
  id: z.number().int().positive(), account_id: z.number().int().positive(), date: z.string().datetime({ offset: true }),
  activityType: z.enum(['payment', 'refund']), balanceBefore: z.number().int(), balanceAfter: z.number().int(),
  paymentDetails: z.object({ paymentMethod: z.string(), amount: shopCount, currency: z.string(), status: z.string(), order_id: z.number().int().positive() }),
}));
export const shopTopupHistorySchema = z.array(shopPaymentHistorySchema.element.extend({
  activityType: z.literal('topup'),
  paymentDetails: shopPaymentHistorySchema.element.shape.paymentDetails.extend({ order_id: z.null() }),
}));
export const shopManagedUsersSchema = z.record(z.string(), z.strictObject({ name: z.string().min(1) }));
export const shopTeamSchema = z.array(z.object({
  id: z.number().int().positive(), user_name: z.string().min(1), avatar: z.string(), role_name: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
}));
export const bookShopRoleSchema = z.object({ id: z.number().int().positive(), name: z.string().min(1) });
export const bookShopRoleListSchema = z.array(bookShopRoleSchema);
export const bookShopOrderStatusSchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1), icon: z.string().min(1),
  possible_next_statuses: z.array(z.number().int().positive()),
});
export const bookShopOrderStatusListSchema = z.array(bookShopOrderStatusSchema);
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

export const quizQuestionSchema = z.object({ question: z.string(), options: z.array(z.string()) });
export const quizQuestionsSchema = z.array(quizQuestionSchema);
export const quizQuestionCountSchema = z.object({ count: z.number().int().positive() });
export const quizAnswerResultSchema = z.object({ isCorrect: z.boolean(), score: z.number() });
export const quizHighscoresSchema = z.object({ highScore: z.array(z.object({ user: z.string(), game: z.string(), score: z.number() })) });
export const hangmanWordSchema = z.object({ word: z.string().min(1) });
export const hangmanHighscoresSchema = z.object({ highScore: z.array(z.object({ user: z.string(), game: z.string(), score: z.number() })) });
export const hangmanScoreSchema = z.object({ game_id: z.number(), user_id: z.number(), score: z.number() });
