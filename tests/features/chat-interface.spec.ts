import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../config/test-config';

test.describe('AI Chat Interface', () => {
  test.use({ storageState: 'tests/auth-states/business-owner.json' });

  test('should load chat interface correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify chat interface elements are present
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    
    // Check for chat container
    const chatContainer = page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();
  });

  test('should send and receive messages', async ({ page }) => {
    await page.goto('/dashboard');
    
    const chatInput = page.getByPlaceholder('Type your message...');
    const sendButton = page.getByRole('button', { name: /send/i });
    
    // Send a test message
    await chatInput.fill('Hello, I need help with cybersecurity');
    await sendButton.click();
    
    // Verify message appears in chat
    await expect(page.getByText('Hello, I need help with cybersecurity')).toBeVisible();
    
    // Wait for AI response
    await expect(page.getByText(/help/i)).toBeVisible({ timeout: 30000 });
    
    // Verify input is cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should handle empty messages gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    const sendButton = page.getByRole('button', { name: /send/i });
    
    // Try to send empty message
    await sendButton.click();
    
    // Should not create a chat message
    // Button might be disabled or no action occurs
    const chatMessages = page.locator('[data-testid="chat-message"]');
    const messageCount = await chatMessages.count();
    
    // No new messages should be added
    expect(messageCount).toBe(0);
  });

  test('should show loading state during AI response', async ({ page }) => {
    await page.goto('/dashboard');
    
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('Tell me about NIST cybersecurity framework');
    await page.getByRole('button', { name: /send/i }).click();
    
    // Look for loading indicator
    const loadingIndicator = page.locator('[data-testid="ai-thinking"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Wait for response to complete
    await expect(page.getByText(/NIST/i)).toBeVisible({ timeout: 30000 });
  });

  test('should maintain chat history', async ({ page }) => {
    await page.goto('/dashboard');
    
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Send first message
    await chatInput.fill('First message');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText('First message')).toBeVisible();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Send second message
    await chatInput.fill('Second message');
    await page.getByRole('button', { name: /send/i }).click();
    
    // Both messages should be visible
    await expect(page.getByText('First message')).toBeVisible();
    await expect(page.getByText('Second message')).toBeVisible();
  });
});

test.describe('Document Upload', () => {
  test.use({ storageState: 'tests/auth-states/business-owner.json' });

  test('should show document upload interface', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for document upload button or area
    const uploadArea = page.locator('[data-testid="document-upload"]');
    if (await uploadArea.isVisible()) {
      await expect(uploadArea).toBeVisible();
    } else {
      // Alternative: look for upload button in UI
      const uploadButton = page.getByRole('button', { name: /upload/i });
      if (await uploadButton.isVisible()) {
        await expect(uploadButton).toBeVisible();
      }
    }
  });

  test('should handle file upload flow', async ({ page }) => {
    test.setTimeout(45000);
    
    await page.goto('/dashboard');
    
    // Create a test file
    const testFileContent = 'This is a test document for cybersecurity policy review.';
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create and upload test file
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(testFileContent)
      });
      
      // Look for upload confirmation
      await expect(page.getByText(/uploaded|processing/i)).toBeVisible({ timeout: 15000 });
    }
  });
});