import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSession, getSettings } from '../src/api-client';

// Mock config
vi.mock('../src/config', () => ({
  apiUrl: 'http://localhost:8000/api'
}));

const handlers = [
  http.get('*/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Test Session' });
  }),
  http.get('*/api/settings', () => {
    return HttpResponse.json({ llm_provider: 'gemini' });
  })
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('api-client', () => {
  it('getSession fetches session data', async () => {
    const session = await getSession('123');
    expect(session.id).toBe('123');
    expect(session.name).toBe('Test Session');
  });

  it('getSettings fetches app settings', async () => {
    const settings = await getSettings();
    expect(settings.llm_provider).toBe('gemini');
  });
});
