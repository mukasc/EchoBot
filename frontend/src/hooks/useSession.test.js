import { renderHook, waitFor, act } from '@testing-library/react';
import { useSession } from './useSession';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useSession hook', () => {
  const sessionId = 'test-session';
  const mockSessionData = {
    id: sessionId,
    name: 'Test Session',
    status: 'awaiting_review',
    transcription_segments: [
      { id: 'seg-1', text: 'First segment' },
      { id: 'seg-2', text: 'Second segment' },
    ],
  };

  it('fetches session on mount', async () => {
    server.use(
      http.get('*/api/sessions/test-session', () => {
        return HttpResponse.json(mockSessionData);
      })
    );

    const { result } = renderHook(() => useSession(sessionId));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSessionData);
  });

  it('calls deleteSegment endpoint and refreshes', async () => {
    let deleteCalled = false;

    server.use(
      http.get('*/api/sessions/test-session', () => {
        if (deleteCalled) {
          return HttpResponse.json({
            ...mockSessionData,
            transcription_segments: [{ id: 'seg-2', text: 'Second segment' }],
          });
        }
        return HttpResponse.json(mockSessionData);
      }),
      http.delete('*/api/sessions/test-session/segments/seg-1', () => {
        deleteCalled = true;
        return HttpResponse.json({ message: 'Segment deleted successfully' });
      })
    );

    const { result } = renderHook(() => useSession(sessionId));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session.transcription_segments).toHaveLength(2);

    await act(async () => {
      await result.current.deleteSegment('seg-1');
    });

    await waitFor(() => {
      expect(result.current.session.transcription_segments).toHaveLength(1);
    });

    expect(deleteCalled).toBe(true);
  });

  it('calls bulkDeleteSegments endpoint and refreshes', async () => {
    let bulkDeletePayload = null;

    server.use(
      http.get('*/api/sessions/test-session', () => {
        if (bulkDeletePayload) {
          return HttpResponse.json({
            ...mockSessionData,
            transcription_segments: [],
          });
        }
        return HttpResponse.json(mockSessionData);
      }),
      http.post('*/api/sessions/test-session/segments/bulk-delete', async ({ request }) => {
        bulkDeletePayload = await request.json();
        return HttpResponse.json({ message: 'Segments deleted successfully' });
      })
    );

    const { result } = renderHook(() => useSession(sessionId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.bulkDeleteSegments(['seg-1', 'seg-2']);
    });

    await waitFor(() => {
      expect(result.current.session.transcription_segments).toHaveLength(0);
    });

    expect(bulkDeletePayload).toEqual({ segment_ids: ['seg-1', 'seg-2'] });
  });
});
