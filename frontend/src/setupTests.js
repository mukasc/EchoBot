import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock browser APIs for Radix UI
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = function() {};
window.HTMLElement.prototype.hasPointerCapture = function() { return false; };
window.HTMLElement.prototype.releasePointerCapture = function() {};
