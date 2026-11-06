import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { captchaChallengeSchema, captchaResultSchema, uploadedFilesSchema } from '@src/sut/schemas';

test.describe('API de archivos y captcha', () => {
  test('las cuatro rutas de archivos declaradas no coinciden con las rutas implementadas', { tag: '@regression' }, async ({ filesCaptchaSandbox: { files } }) => {
    const documented = [
      await files.documentedOwnFiles(),
      await files.documentedUserFiles(1),
      await files.documentedPublicFiles(),
      await files.documentedPublicUserFiles('1,2'),
    ];
    for (const response of documented) expect(response.status()).toBe(404);
  });

  test('las rutas implementadas de archivos requieren auth para privados y devuelven listas públicas', { tag: '@regression' }, async ({ filesCaptchaSandbox: { files, anonymousFiles } }) => {
    expect((await anonymousFiles.ownUploadedFiles()).status()).toBe(401);
    const own = await files.ownUploadedFiles();
    expect(own.status()).toBe(200);
    expectSchema(uploadedFilesSchema, await own.json());

    const wrongUser = await files.ownFilesForUser(999999);
    expect(wrongUser.status()).toBe(401);
    const publicAll = await anonymousFiles.publicUploadedFiles();
    expect(publicAll.status()).toBe(200);
    expectSchema(uploadedFilesSchema, await publicAll.json());
    const publicUsers = await anonymousFiles.publicUploadedFilesForUsers('1,2');
    expect(publicUsers.status()).toBe(200);
    expectSchema(uploadedFilesSchema, await publicUsers.json());
  });

  test('captcha genera reto, rechaza entradas inválidas y consume cada reto al verificar', { tag: '@regression' }, async ({ filesCaptchaSandbox: { captcha } }) => {
    const missing = await captcha.verify({});
    expect(missing.status()).toBe(422);
    const unknown = await captcha.verify({ uuid: '00000000-0000-4000-8000-000000000000', result: 1 });
    expect(unknown.status()).toBe(404);

    const wrongChallengeResponse = await captcha.challenge();
    expect(wrongChallengeResponse.status()).toBe(200);
    const wrongChallenge = await wrongChallengeResponse.json();
    expectSchema(captchaChallengeSchema, wrongChallenge);
    expect(wrongChallenge.equationString).toEqual(expect.any(String));
    expect(wrongChallenge.result).toEqual(expect.any(Number));
    const wrong = await captcha.verify({ uuid: wrongChallenge.uuid, result: wrongChallenge.result + 1 });
    expect(wrong.status()).toBe(400);

    const challengeResponse = await captcha.challenge();
    expect(challengeResponse.status()).toBe(200);
    const challenge = await challengeResponse.json();
    expectSchema(captchaChallengeSchema, challenge);
    const verified = await captcha.verify({ uuid: challenge.uuid, result: challenge.result });
    expect(verified.status()).toBe(200);
    expectSchema(captchaResultSchema, await verified.json());
    expect(await verified.json()).toEqual({ isCaptchaCorrect: true });
    expect((await captcha.verify({ uuid: challenge.uuid, result: challenge.result })).status()).toBe(404);
  });
});
