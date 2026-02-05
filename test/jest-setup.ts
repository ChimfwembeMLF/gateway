/**
 * Jest Setup File
 * Runs before all tests to configure the environment
 */

import { webcrypto } from 'crypto';

// Ensure crypto is available globally for uuid module
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto as any,
  writable: true,
});
