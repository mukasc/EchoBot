import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/api/sessions/', () => {
    return HttpResponse.json([
      { id: '1', name: 'Session 1', status: 'completed' },
      { id: '2', name: 'Session 2', status: 'recording' },
    ]);
  }),
  
  http.post('*/api/sessions/', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({ id: '3', ...data }, { status: 201 });
  }),
];
