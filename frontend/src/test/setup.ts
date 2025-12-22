import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock import.meta.env for Vite environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      PUBLIC_BACKEND_URL: 'http://localhost:8080',
      PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
