import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { buildFlashpost, buildSurvey, communityMissingId } from '@src/sut/data/community';
import { buildUser } from '@src/sut/data/users';
import { flashpostSchema, messageSchema, surveyResponseSchema } from '@src/sut/schemas';

test.describe('Publicaciones, mensajería y encuestas', () => {
  test('flashposts propios: alta, lectura, permisos, actualización y eliminación', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const data = buildFlashpost();
    const response = await sandbox.community.createFlash(data);
    expect(response.status()).toBe(201);
    const post = await response.json();
    expectSchema(flashpostSchema, post);
    try {
      expect(post).toMatchObject(data);
      const read = await sandbox.community.flashpost(post.id);
      expect(read.status()).toBe(200);
      expect(await read.json()).toEqual(post);
      const publicRead = await sandbox.anonymousCommunity.flashpost(post.id);
      expect(publicRead.status()).toBe(200);
      expect(await publicRead.json()).toEqual(post);
      expect((await sandbox.otherCommunity.updateFlash(post.id, { body: 'forbidden' })).status()).toBe(401);
      expect((await sandbox.otherCommunity.removeFlash(post.id)).status()).toBe(401);
      expect((await sandbox.community.updateFlash(post.id, { unexpected: true })).status()).toBe(422);
      const changed = await sandbox.community.updateFlash(post.id, { body: 'Actualizado', is_public: false });
      expect(changed.status()).toBe(200);
      expect(await changed.json()).toMatchObject({ id: post.id, body: 'Actualizado', date: post.date });
      expect((await sandbox.anonymousCommunity.flashpost(post.id)).status()).toBe(401);
      const list = await sandbox.anonymousCommunity.flashposts();
      expect(list.status()).toBe(200);
      expect(await list.json()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: post.id })]));
    } finally { expect((await sandbox.community.removeFlash(post.id)).status()).toBe(200); }
    expect((await sandbox.community.flashpost(post.id)).status()).toBe(404);
  });

  test('flashposts: inexistentes, entradas inválidas y límite temporal', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    expect((await sandbox.community.flashposts()).status()).toBe(200);
    expect((await sandbox.community.flashpost(communityMissingId)).status()).toBe(404);
    expect((await sandbox.community.updateFlash(communityMissingId, { body: 'QA' })).status()).toBe(404);
    expect((await sandbox.community.removeFlash(communityMissingId)).status()).toBe(404);
    expect((await sandbox.community.createFlash({})).status()).toBe(422);
    expect((await sandbox.community.createFlash({ body: 'x'.repeat(129) })).status()).toBe(422);
    expect((await sandbox.community.createFlash({ body: 'QA', settings: { color: 'invalid' } })).status()).toBe(422);
    expect((await sandbox.community.updateFlash(1, { body: 'QA' })).status()).toBe(403);
    expect((await sandbox.community.removeFlash(1)).status()).toBe(403);
  });

  test('operaciones privadas rechazan sesión ausente', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const client = sandbox.anonymousCommunity;
    expect((await client.createFlash(buildFlashpost())).status()).toBe(401);
    expect((await client.updateFlash(communityMissingId, { body: 'QA' })).status()).toBe(401);
    expect((await client.removeFlash(communityMissingId)).status()).toBe(401);
    expect((await client.contacts()).status()).toBe(401);
    expect((await client.addContact('qa-no-user@test.test.dev')).status()).toBe(401);
    expect((await client.messages()).status()).toBe(401);
    expect((await client.sendMessage({ to: 1, content: 'QA' })).status()).toBe(401);
    expect((await client.unread()).status()).toBe(401);
    expect((await client.surveyResponses()).status()).toBe(401);
    expect((await client.surveyResponse(communityMissingId)).status()).toBe(401);
    expect((await client.submitSurvey(buildSurvey(1))).status()).toBe(401);
  });

  test('contactos y mensajes solo entre usuarios sintéticos propios', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const first = buildUser(), second = buildUser(), third = buildUser();
    const clients = [];
    for (const data of [first, second, third]) {
      const created = await sandbox.users.create(data);
      expect(created.status()).toBe(201);
      const user = await created.json();
      const login = await sandbox.auth.login(data);
      expect(login.status()).toBe(200);
      clients.push({ id: user.id as number, client: sandbox.communityForToken((await login.json()).access_token) });
    }
    const [a, b, c] = clients;
    expect((await a.client.addContact(first.email)).status()).toBe(409);
    expect((await a.client.addContact('qa-no-user@test.test.dev')).status()).toBe(404);
    expect((await a.client.sendMessage({})).status()).toBe(422);
    expect((await a.client.addContact(second.email)).status()).toBe(201);
    expect((await a.client.sendMessage({ to: c.id, content: 'QA' })).status()).toBe(403);
    expect((await a.client.addContact(second.email)).status()).toBe(409);
    expect((await a.client.addContact(third.email)).status()).toBe(200);
    const contacts = await a.client.contacts();
    expect(contacts.status()).toBe(200);
    expect(await contacts.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: b.id }), expect.objectContaining({ id: c.id })]));
    const text = `QA ${crypto.randomUUID()}`;
    const sent = await a.client.sendMessage({ to: b.id, content: text });
    expect(sent.status()).toBe(201);
    const message = await sent.json();
    expectSchema(messageSchema, message);
    expect(message).toMatchObject({ from: a.id, to: b.id, content: text });
    const unread = await b.client.unread();
    expect(unread.status()).toBe(200);
    expect(await unread.json()).toMatchObject({ allUnreadMessages: 1, unreadMessagesPerUser: { [a.id]: 1 } });
    const query = await b.client.messages({ userId: a.id, idFrom: 0 });
    expect(query.status()).toBe(200);
    expect((await query.json()).messages).toEqual([message]);
    const filtered = await b.client.messages({ userId: a.id, idFrom: message.id });
    expect(filtered.status()).toBe(200);
    expect((await filtered.json()).messages).toEqual([]);
    const all = await b.client.messages();
    expect(all.status()).toBe(200);
    expect(await all.json()).toEqual(expect.arrayContaining([message]));
    const unrelated = await c.client.messages({ userId: a.id, idFrom: 0 });
    expect(unrelated.status()).toBe(200);
    expect((await unrelated.json()).messages).toEqual([]);
  });

  test('descripciones, preguntas y estadísticas de encuestas', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    for (const type of [1, 2]) {
      const description = await sandbox.anonymousCommunity.surveyDescription(type);
      expect(description.status()).toBe(200);
      expect((await description.json()).description.base).toEqual(expect.any(String));
      const question = await sandbox.community.surveyQuestion(type, 1);
      expect(question.status()).toBe(200);
      expect((await question.json()).question).toContain('<');
      expect((await sandbox.community.surveyQuestion(type, communityMissingId)).status()).toBe(404);
      const stats = await sandbox.anonymousCommunity.surveyStatistics(type);
      expect(stats.status()).toBe(200);
      expect(Object.keys(await stats.json()).length).toBeGreaterThan(0);
    }
    expect((await sandbox.anonymousCommunity.surveyStatistics(communityMissingId)).status()).toBe(404);
  });

  test('respuesta de encuesta propia se crea, consulta y actualiza sin exponerla a otro usuario', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const data = buildUser();
    const createdUser = await sandbox.users.create(data);
    expect(createdUser.status()).toBe(201);
    const user = await createdUser.json();
    const login = await sandbox.auth.login(data);
    expect(login.status()).toBe(200);
    const client = sandbox.communityForToken((await login.json()).access_token);
    expect((await client.surveyResponses()).status()).toBe(404);
    const payload = buildSurvey(user.id);
    const response = await client.submitSurvey(payload);
    expect(response.status()).toBe(201);
    const survey = await response.json();
    expectSchema(surveyResponseSchema, survey);
    expect(survey).toMatchObject(payload);
    const single = await client.surveyResponse(survey.id);
    expect(single.status()).toBe(200);
    expect(await single.json()).toEqual(survey);
    const list = await client.surveyResponses();
    expect(list.status()).toBe(200);
    expect(await list.json()).toEqual([survey]);
    expect((await sandbox.otherCommunity.surveyResponse(survey.id)).status()).toBe(404);
    expect((await client.submitSurvey({ ...payload, answers: { 'REST API testing': ['no'] } })).status()).toBe(200);
    expect((await client.submitSurvey({})).status()).toBe(422);
    expect((await client.submitSurvey({ ...payload, type: 'qa-invalid' })).status()).toBe(422);
    expect((await client.submitSurvey({ ...payload, date: 'qa-invalid' })).status()).toBe(422);
    expect((await client.malformedSurvey()).status()).toBe(400);
  });
});
