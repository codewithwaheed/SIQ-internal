import { test, expect } from "@playwright/test";

test.describe("Chat Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "password123");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("/dashboard");
  });

  test("should handle basic user question and AI response", async ({
    page,
  }) => {
    await page.goto("/chat");

    // Send a question
    await page.fill('[data-testid="chat-input"]', "What is NIST 800-171?");
    await page.click('[data-testid="send-button"]');

    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]', {
      timeout: 30000,
    });

    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toContain("NIST");
    expect(response.length).toBeGreaterThan(50);
  });

  test("should handle escalation flow", async ({ page }) => {
    await page.goto("/chat");

    // Send initial question
    await page.fill(
      '[data-testid="chat-input"]',
      "I need help with incident response planning.",
    );
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="ai-response"]');

    // Click escalation button
    await page.click('[data-testid="escalate-button"]');

    // Fill escalation form
    await page.fill(
      '[data-testid="escalation-reason"]',
      "Need detailed incident response plan review",
    );
    await page.click('[data-testid="submit-escalation"]');

    // Should show escalation confirmation
    await page.waitForSelector('[data-testid="escalation-success"]');
    const confirmationText = await page.textContent(
      '[data-testid="escalation-success"]',
    );
    expect(confirmationText).toContain("escalated");
  });

  test("should save conversation history", async ({ page }) => {
    await page.goto("/chat");

    // Send multiple messages
    await page.fill(
      '[data-testid="chat-input"]',
      "First message about security frameworks",
    );
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]');

    await page.fill(
      '[data-testid="chat-input"]',
      "Second message about compliance",
    );
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]');

    // Navigate away and back
    await page.goto("/dashboard");
    await page.goto("/chat");

    // Check conversation history
    const messages = await page.locator('[data-testid="chat-message"]');
    expect(await messages.count()).toBeGreaterThanOrEqual(4); // 2 user + 2 AI messages
  });

  test("should handle long messages properly", async ({ page }) => {
    await page.goto("/chat");

    const longMessage =
      "This is a very long message that tests the chat interface handling of extended content. ".repeat(
        50,
      );

    await page.fill('[data-testid="chat-input"]', longMessage);
    await page.click('[data-testid="send-button"]');

    // Check message is displayed correctly
    await page.waitForSelector('[data-testid="user-message"]');
    const displayedMessage = await page.textContent(
      '[data-testid="user-message"]',
    );
    expect(displayedMessage).toContain(longMessage.substring(0, 100));
  });

  test("should handle empty message submission", async ({ page }) => {
    await page.goto("/chat");

    // Try to send empty message
    await page.click('[data-testid="send-button"]');

    // Should not send message
    const messages = await page.locator('[data-testid="chat-message"]');
    expect(await messages.count()).toBe(0);
  });

  test("should handle message rating", async ({ page }) => {
    await page.goto("/chat");

    // Send question and get response
    await page.fill('[data-testid="chat-input"]', "What is cybersecurity?");
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]');

    // Rate the response
    await page.click('[data-testid="thumbs-up-button"]');

    // Should show feedback confirmation
    await page.waitForSelector('[data-testid="rating-confirmation"]');
  });

  test("should handle document upload in chat", async ({ page }) => {
    await page.goto("/chat");

    // Upload a test document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/fixtures/test-document.pdf");

    // Wait for upload confirmation
    await page.waitForSelector('[data-testid="upload-success"]');

    // Send question about uploaded document
    await page.fill(
      '[data-testid="chat-input"]',
      "Analyze the uploaded document",
    );
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="ai-response"]');
    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toContain("document");
  });
});

test.describe("Chat Security", () => {
  test("should sanitize malicious input", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "password123");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("/dashboard");

    await page.goto("/chat");

    // Send potentially malicious script
    await page.fill(
      '[data-testid="chat-input"]',
      '<script>alert("XSS")</script>',
    );
    await page.click('[data-testid="send-button"]');

    // Check that script is not executed
    await page.waitForSelector('[data-testid="user-message"]');
    const messageContent = await page.innerHTML('[data-testid="user-message"]');
    expect(messageContent).not.toContain("<script>");
    expect(messageContent).toContain("&lt;script&gt;");
  });
});
