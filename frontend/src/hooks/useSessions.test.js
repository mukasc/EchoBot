import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessions } from './useSessions';
import { describe, it, expect, vi } from 'vitest';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useSessions hook', () => {
  it('fetches sessions on mount', async () => {
    const { result } = renderHook(() => useSessions());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.sessions[0].name).toBe('Session 1');
  });

  it('creates a new session and updates state', async () => {
    const { result } = renderHook(() => useSessions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCount = result.current.sessions.length;

    await act(async () => {
      await result.current.createSession({ name: 'New Session' });
    });

    expect(result.current.sessions).toHaveLength(initialCount + 1);
    expect(result.current.sessions[0].name).toBe('New Session');
    expect(result.current.sessions[0].id).toBe('3');
  });
});
