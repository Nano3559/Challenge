export const communityMissingId = 999999;
export function buildFlashpost() { return { body: `QA ${crypto.randomUUID()}`, is_public: true, settings: { color: '#123456' } }; }
export function buildSurvey(userId: number) { return { user_id: userId, type: 1, date: '2026-01-01T00:00:00.000Z', answers: { 'REST API testing': ['yes'] } }; }
