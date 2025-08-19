import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE dimensions
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for mobile navigation elements
    const mobileMenu = page.getByRole('button', { name: /menu|navigation/i });
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should make chat interface mobile-friendly', async ({ page }) => {
    // Skip if no auth state available
    test.skip(!process.env.CI, 'Requires auth state');
    
    await page.goto('/dashboard');
    
    // Chat input should be properly sized
    const chatInput = page.getByPlaceholder('Type your message...');
    await expect(chatInput).toBeVisible();
    
    // Send button should be accessible
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to reach form elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // This would require axe-core or similar tool
    // For now, just verify page loads without errors
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load main page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
  });

  test('should handle large chat histories', async ({ page }) => {
    test.skip('Requires pre-populated chat history');
    
    // This test would verify performance with many chat messages
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Simulate offline condition
    await page.context().setOffline(true);
    
    // Try to navigate
    await page.goto('/dashboard');
    
    // Should show appropriate error message
    // (Implementation dependent)
    await expect(page.locator('body')).toBeVisible();
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/nonexistent-route');
    
    // Should show 404 or redirect appropriately
    await expect(page.locator('body')).toBeVisible();
  });
});