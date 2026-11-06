import { BaseApiClient } from '@src/core';

export class FilesClient extends BaseApiClient {
  documentedOwnFiles() { return this.get('/api/files/uploaded'); }
  documentedUserFiles(userId: string | number) { return this.get(`/api/files/uploaded/${userId}`); }
  documentedPublicFiles() { return this.get('/api/files/uploaded/public'); }
  documentedPublicUserFiles(userIds: string) { return this.get(`/api/files/uploaded/public/users/${encodeURIComponent(userIds)}`); }
  ownUploadedFiles() { return this.get('/api/files/articles/uploaded'); }
  ownFilesForUser(userId: string | number) { return this.get('/api/files/articles/uploaded', { userId }); }
  publicUploadedFiles() { return this.get('/api/files/articles/uploaded/public'); }
  publicUploadedFilesForUsers(userIds: string) { return this.get('/api/files/articles/uploaded/public', { userIds }); }
}
