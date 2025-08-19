import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should allow new user registration', async ({ page }) => {
    const randomEmail = `test${Date.now()}@example.com`;

    // Switch to signup mode
    await page.click('[data-testid="signup-tab"]');

    // Fill registration form
    await page.fill('[data-testid="email-input"]', randomEmail);
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="first-name-input"]', 'Test');
    await page.fill('[data-testid="last-name-input"]', 'User');

    await page.click('[data-testid="signup-button"]');

    // Should redirect to dashboard or show confirmation
    await page.waitForURL(/\/dashboard|\/auth/);
  });

  test('should prevent registration with existing email', async ({ page }) => {
    await page.click('[data-testid="signup-tab"]');

    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');

    await page.click('[data-testid="signup-button"]');

    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]');
    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('already exists');
  });

  test('should prevent login with wrong password', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="error-message"]');
    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('Invalid');
  });

  test('should allow login with correct credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('should protect authenticated routes', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to auth page
    await page.waitForURL('/auth');
    expect(page.url()).toContain('/auth');
  });

  test('should allow access to authenticated routes after login', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Test accessing protected route
    await page.goto('/chat');
    expect(page.url()).toContain('/chat');
  });

  test('should handle logout properly', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to home page
    await page.waitForURL('/');

    // Accessing protected route should redirect to auth
    await page.goto('/dashboard');
    await page.waitForURL('/auth');
  });
});

test.describe('Password Security', () => {
  test('should enforce password strength requirements', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="signup-tab"]');

    // Test weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.waitForSelector('[data-testid="password-strength-indicator"]');

    const strengthIndicator = await page.textContent('[data-testid="password-strength-indicator"]');
    expect(strengthIndicator).toContain('weak');
  });

  test('should require password confirmation match', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="signup-tab"]');

    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPass123!');

    await page.click('[data-testid="signup-button"]');

    await page.waitForSelector('[data-testid="error-message"]');
    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('match');
  });
});
