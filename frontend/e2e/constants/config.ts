/**
 * E2E test configuration constants.
 */
export const E2E_CONFIG = {
  /** Default assertion timeout */
  TIMEOUT: {
    ASSERTION: 20000,
    NAVIGATION: 15000,
    ANIMATION: 500,
    ACTION: 1000,
  },
  
  /** Test users */
  USERS: {
    PRIMARY: {
      EMAIL: process.env.E2E_TEST_EMAIL || 'test.dev.g6@gmail.com',
      PASSWORD: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
    },
    ADMIN: {
      EMAIL: 'test.admin.g6@gmail.com',
      PASSWORD: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
    },
    SUPER_ADMIN: {
      EMAIL: 'test.superadmin.g6@gmail.com',
      PASSWORD: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
    },
    SECONDARY: {
      EMAIL: 'e2e-test-user2@example.com',
      PASSWORD: 'TestSecurePassword123!',
    },
  },
  
  /** Default test data */
  DEFAULTS: {
    CREDIT_BALANCE: 100,
    RESERVATION_DAYS_AHEAD: 7,
    RESERVATION_DURATION_DAYS: 3,
    INITIAL_CREDITS: 100,
    AUTH_TOKEN_EXPIRY: 3600,
    DEFAULT_EQUIPMENT_COUNT: 2,
    /** Days to offset start date per worker index to avoid reservation grouping */
    WORKER_DATE_OFFSET: 10,
  },

  /** Default equipment types for test database seeding */
  EQUIPMENT_TYPES: {
    KAYAK: { name: 'kayak', credit_cost_per_day: 4 },
    PADDLE: { name: 'paddle', credit_cost_per_day: 2 },
  },

  /** Prefix for test equipment names (for cleanup identification) */
  TEST_EQUIPMENT_PREFIX: 'E2E-Test-',
} as const;
