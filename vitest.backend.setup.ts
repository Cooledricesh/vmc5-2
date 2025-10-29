import { vi } from 'vitest';

// Global mocks for backend tests
global.fetch = vi.fn();

// Mock environment variables
process.env.NODE_ENV = 'test';