// Test Setup Configuration for Unit Tests
// Jest setup file for src/ unit tests

import 'reflect-metadata';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_NAME = 'payment_gateway_test';
process.env.DATABASE_USERNAME = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRATION = '7d';

// Suppress logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Mock crypto if needed
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto');
}
