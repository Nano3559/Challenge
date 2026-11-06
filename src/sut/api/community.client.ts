import { BaseApiClient } from '@src/core';

export class CommunityClient extends BaseApiClient {
  flashposts() { return this.get('/api/flashposts'); }
  flashpost(id: number) { return this.get(`/api/flashposts/${id}`); }
  createFlash(data: Record<string, unknown>) { return this.post('/api/flashposts', data); }
  updateFlash(id: number, data: Record<string, unknown>) { return this.patch(`/api/flashposts/${id}`, data); }
  removeFlash(id: number) { return this.delete(`/api/flashposts/${id}`); }
  contacts() { return this.get('/api/messenger/contacts'); }
  addContact(email: string) { return this.put('/api/messenger/contacts', { email }); }
  messages(params?: Record<string, string | number>) { return this.get('/api/messenger/messages', params); }
  sendMessage(data: Record<string, unknown>) { return this.post('/api/messenger/messages', data); }
  unread() { return this.get('/api/messenger/unread'); }
  surveyDescription(type: number) { return this.get(`/api/surveys/${type}/description`); }
  surveyQuestion(type: number, id: number) { return this.get(`/api/surveys/${type}/questions/${id}`); }
  surveyStatistics(type: number) { return this.get(`/api/surveys/statistics/${type}`); }
  surveyResponses() { return this.get('/api/surveys/responses'); }
  surveyResponse(id: number) { return this.get(`/api/surveys/responses/${id}`); }
  submitSurvey(data: Record<string, unknown>) { return this.post('/api/surveys/responses', data); }
  malformedSurvey() { return this.postRawJson('/api/surveys/responses', '{'); }
}
