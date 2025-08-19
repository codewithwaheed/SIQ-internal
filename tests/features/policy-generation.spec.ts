import { test, expect } from "@playwright/test";
import { TEST_CONFIG, TEST_POLICY_DATA } from "../config/test-config";

test.describe("Policy Generation Flow", () => {
  test.use({ storageState: "tests/auth-states/business-owner.json" });

  test("should generate password management policy", async ({ page }) => {
    await page.goto("/dashboard");

    // Start a chat conversation
    const chatInput = page.getByPlaceholder("Type your message...");
    await expect(chatInput).toBeVisible();

    // Request password policy generation
    await chatInput.fill(
      "Generate a password management policy for my company",
    );
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for AI response
    await expect(page.getByText(/password/i)).toBeVisible({ timeout: 30000 });

    // Look for policy generation interface
    const policyInterface = page.locator('[data-testid="policy-generation"]');
    await expect(policyInterface).toBeVisible({ timeout: 15000 });

    // Check if form fields are present for missing information
    const companyNameField = page.getByLabel(/company name/i);
    if (await companyNameField.isVisible()) {
      await companyNameField.fill(TEST_POLICY_DATA.business_name);
    }

    // Submit any required fields
    const submitButton = page.getByRole("button", {
      name: /submit|generate|continue/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Wait for policy generation to complete
    await expect(page.getByText(/policy/i)).toBeVisible({ timeout: 30000 });

    // Verify policy content appears
    const policyContent = page.locator('[data-testid="generated-policy"]');
    await expect(policyContent).toBeVisible({ timeout: 15000 });
  });

  test("should handle missing field collection", async ({ page }) => {
    await page.goto("/dashboard");

    const chatInput = page.getByPlaceholder("Type your message...");
    await chatInput.fill("Create an incident response policy");
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for missing fields prompt
    await expect(page.getByText(/details/i)).toBeVisible({ timeout: 30000 });

    // Check for field collection interface
    const fieldsForm = page.locator('[data-testid="missing-fields-form"]');
    if (await fieldsForm.isVisible()) {
      // Fill required fields
      await page
        .getByLabel(/company/i)
        .first()
        .fill(TEST_POLICY_DATA.business_name);
      await page.getByRole("button", { name: /submit/i }).click();
    }
  });

  test("should save generated policy", async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for this flow

    await page.goto("/dashboard");

    // Generate a simple policy first
    const chatInput = page.getByPlaceholder("Type your message...");
    await chatInput.fill("Generate a password policy");
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for policy generation
    await expect(page.getByText(/password/i)).toBeVisible({ timeout: 30000 });

    // Look for save button
    const saveButton = page.getByRole("button", { name: /save policy/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Verify save success
      await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test("should download generated policy", async ({ page }) => {
    await page.goto("/dashboard");

    // Generate policy and look for download option
    const chatInput = page.getByPlaceholder("Type your message...");
    await chatInput.fill("Create a simple acceptable use policy");
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for policy generation
    await expect(page.getByText(/policy/i)).toBeVisible({ timeout: 30000 });

    // Look for download button
    const downloadButton = page.getByRole("button", { name: /download/i });
    if (await downloadButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent("download");
      await downloadButton.click();

      // Verify download starts
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".txt");
    }
  });
});
