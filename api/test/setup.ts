process.env.APP_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5433/modalpha_test?host=/tmp';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'admin@modalpha.test';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'Admin-password-123';
process.env.ADMIN_BOOTSTRAP_MOBILE = '+919900000001';
