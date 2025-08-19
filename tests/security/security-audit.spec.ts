import { test, expect } from '@playwright/test';

test.describe('Security Audit', () => {
  test.describe('Authentication & Authorization', () => {
    test('should deny access to admin APIs with user token', async ({ request, page }) => {
      // Login as regular user
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Get user token from browser context
      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name.includes('auth'));

      // Try to access admin-only endpoint
      const response = await request.get('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${authCookie?.value || ''}`,
        },
      });

      expect(response.status()).toBe(403);
    });

    test('should return 401 for requests without token', async ({ request }) => {
      const response = await request.get('/api/conversations');
      expect(response.status()).toBe(401);
    });

    test('should prevent SQL injection in parameters', async ({ request, page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Test SQL injection in CVE endpoint
      const maliciousInput = "'; DROP TABLE users; --";
      const response = await request.get(`/api/cve/${maliciousInput}`);

      // Should return validation error, not internal server error
      expect([400, 404]).toContain(response.status());
    });

    test('should validate CVE ID format properly', async ({ request, page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      const invalidFormats = [
        'not-a-cve',
        'CVE-AAAA-BBBB',
        'CVE-2021-',
        'CVE-2021-AAAA',
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
      ];

      for (const invalidFormat of invalidFormats) {
        const response = await request.get(`/api/cve/${invalidFormat}`);
        expect([400, 404]).toContain(response.status());
      }
    });
  });

  test.describe('Cross-Site Scripting (XSS)', () => {
    test('should escape user input in chat messages', async ({ page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/chat');

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      for (const payload of xssPayloads) {
        await page.fill('[data-testid="chat-input"]', payload);
        await page.click('[data-testid="send-button"]');
        await page.waitForSelector('[data-testid="user-message"]');

        // Check that payload is escaped in DOM
        const messageContent = await page.innerHTML('[data-testid="user-message"]');
        expect(messageContent).not.toContain('<script>');
        expect(messageContent).not.toContain('javascript:');
        expect(messageContent).not.toContain('onerror=');
      }
    });

    test('should sanitize AI responses', async ({ page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/chat');

      // Ask AI to include potential XSS
      await page.fill('[data-testid="chat-input"]', 'Show me HTML with script tags');
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="ai-response"]');

      const response = await page.innerHTML('[data-testid="ai-response"]');
      // AI response should not contain executable scripts
      expect(response).not.toContain('<script>');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should implement rate limiting on API endpoints', async ({ request }) => {
      const requests = Array.from({ length: 100 }, () => request.get('/api/cve/CVE-2021-44228'));

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status() === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit login attempts', async ({ page }) => {
      await page.goto('/auth');

      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        await page.waitForTimeout(1000);
      }

      // Should show rate limiting message
      await page.waitForSelector('[data-testid="rate-limit-message"]');
    });
  });

  test.describe('Data Validation', () => {
    test('should validate email format in registration', async ({ page }) => {
      await page.goto('/auth');
      await page.click('[data-testid="signup-tab"]');

      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.com',
      ];

      for (const email of invalidEmails) {
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="password-input"]', 'ValidPass123!');
        await page.click('[data-testid="signup-button"]');

        // Should show validation error
        await page.waitForSelector('[data-testid="validation-error"]');
        const errorText = await page.textContent('[data-testid="validation-error"]');
        expect(errorText).toContain('email');
      }
    });

    test('should validate file uploads', async ({ page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/chat');

      const fileInput = page.locator('input[type="file"]');
      if ((await fileInput.count()) > 0) {
        // Test malicious file extension
        await fileInput.setInputFiles({
          name: 'malicious.exe',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('fake executable content'),
        });

        // Should reject dangerous file types
        await page.waitForSelector('[data-testid="upload-error"]');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should not leak sensitive information in errors', async ({ page }) => {
      await page.goto('/auth');

      // Try to trigger various errors
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="error-message"]');
      const errorText = await page.textContent('[data-testid="error-message"]');

      // Should not contain stack traces or internal details
      expect(errorText).not.toContain('Error:');
      expect(errorText).not.toContain('at ');
      expect(errorText).not.toContain('database');
      expect(errorText).not.toContain('internal');
    });

    test('should handle API errors gracefully', async ({ request }) => {
      // Test non-existent endpoint
      const response = await request.get('/api/nonexistent');
      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('trace');
    });
  });

  test.describe('Content Security Policy', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();

      // Should have security headers
      expect(headers).toHaveProperty('x-frame-options');
      expect(headers).toHaveProperty('x-content-type-options');
    });
  });
});

test.describe('OWASP Top 10 Compliance', () => {
  test('A01: Broken Access Control', async ({ request, page }) => {
    // Test vertical privilege escalation
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Try to access admin panel
    await page.goto('/admin');

    // Should be redirected or show access denied
    expect(page.url()).not.toContain('/admin');
  });

  test('A03: Injection', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    await page.goto('/chat');

    // Test various injection payloads
    const injectionPayloads = [
      "'; DROP TABLE messages; --",
      '${7*7}',
      '{{7*7}}',
      '<%= 7*7 %>',
      '#{7*7}',
    ];

    for (const payload of injectionPayloads) {
      await page.fill('[data-testid="chat-input"]', payload);
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="user-message"]');

      // Payload should be treated as literal text
      const messageContent = await page.textContent('[data-testid="user-message"]');
      expect(messageContent).toContain(payload);
    }
  });

  test('A07: Identification and Authentication Failures', async ({ page }) => {
    // Test session management
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Clear session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected resource
    await page.goto('/chat');

    // Should redirect to login
    await page.waitForURL('/auth');
  });
});
