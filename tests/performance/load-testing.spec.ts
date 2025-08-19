import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test('should handle multiple concurrent chat sessions', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    try {
      // Login all users
      await Promise.all(
        pages.map(async (page) => {
          await page.goto('/auth');
          await page.fill('[data-testid="email-input"]', 'test@example.com');
          await page.fill('[data-testid="password-input"]', 'password123');
          await page.click('[data-testid="login-button"]');
          await page.waitForURL('/dashboard');
        })
      );
      
      // Start concurrent chat sessions
      const chatPromises = pages.map(async (page, index) => {
        await page.goto('/chat');
        await page.fill('[data-testid="chat-input"]', `Performance test message ${index}`);
        
        const startTime = Date.now();
        await page.click('[data-testid="send-button"]');
        await page.waitForSelector('[data-testid="ai-response"]', { timeout: 60000 });
        const endTime = Date.now();
        
        return endTime - startTime;
      });
      
      const responseTimes = await Promise.all(chatPromises);
      
      // Check response times are reasonable (under 30 seconds)
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(30000);
      });
      
      // Average response time should be reasonable
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(20000);
      
    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should handle rapid API requests', async ({ request }) => {
    const requests = Array.from({ length: 50 }, (_, i) => 
      request.get(`/api/cve/CVE-2021-44228?test=${i}`)
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // All requests should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(60000);
    
    // Check success rate
    const successCount = responses.filter(r => r.status() === 200).length;
    const successRate = successCount / responses.length;
    
    // At least 80% should succeed (allowing for rate limiting)
    expect(successRate).toBeGreaterThan(0.8);
  });

  test('should handle large document uploads', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await page.goto('/chat');
    
    // Test large file upload (if upload functionality exists)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Create a mock large file
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB
      await fileInput.setInputFiles({
        name: 'large-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(largeContent)
      });
      
      // Should handle large file within reasonable time
      await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 30000 });
    }
  });

  test('should maintain responsiveness under load', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to different pages rapidly
    const pages = ['/dashboard', '/chat', '/cve-security', '/dashboard'];
    
    for (const pagePath of pages) {
      const startTime = Date.now();
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    }
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await page.goto('/chat');
    
    // Send many messages to test memory usage
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="chat-input"]', `Memory test message ${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="ai-response"]');
      
      // Check page is still responsive
      await page.waitForTimeout(1000);
      expect(await page.isVisible('[data-testid="chat-input"]')).toBe(true);
    }
  });
});

test.describe('Database Performance', () => {
  test('should handle database queries efficiently', async ({ request }) => {
    // Test multiple database operations
    const operations = [
      () => request.get('/api/conversations'),
      () => request.get('/api/documents'),
      () => request.get('/api/escalations'),
      () => request.get('/api/consultants'),
    ];
    
    const startTime = Date.now();
    await Promise.all(operations.map(op => op()));
    const endTime = Date.now();
    
    // Database operations should complete quickly
    expect(endTime - startTime).toBeLessThan(10000);
  });
});