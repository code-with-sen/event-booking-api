// Runs before each test file. Defaults point at a local test database; CI overrides DATABASE_URL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5432/event_booking_test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
