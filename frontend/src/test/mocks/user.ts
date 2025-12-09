import type { User, Session } from '@supabase/supabase-js';
import type { SessionInfo } from '@/types';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id-12345',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'mock-access-token-jwt',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides,
});

export const createMockSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  userId: 'test-user-id-12345',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  creditBalance: 100,
  isEnabled: true,
  expiresAt: '2025-12-31T00:00:00Z',
  ...overrides,
});

// Prebuilt scenarios
export const mockUsers = {
  enabledSuperAdmin: createMockUser({
    user_metadata: { role: 'super_admin' },
  }),
  enabledAdmin: createMockUser({
    user_metadata: { role: 'admin' },
  }),
  enabledUser: createMockUser({
    user_metadata: { role: 'user' },
  }),
  disabledUser: createMockUser({
    user_metadata: { role: 'user' },
  }),
};

export const mockSessionInfos = {
  enabledSuperAdmin: createMockSessionInfo({ role: 'super_admin', isEnabled: true }),
  enabledAdmin: createMockSessionInfo({ role: 'admin', isEnabled: true }),
  enabledUser: createMockSessionInfo({ role: 'user', isEnabled: true }),
  disabledSuperAdmin: createMockSessionInfo({ role: 'super_admin', isEnabled: false }),
  disabledUser: createMockSessionInfo({ role: 'user', isEnabled: false }),
};
