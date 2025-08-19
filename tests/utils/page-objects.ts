// Playwright Page Object Model for reusable components

export class AuthPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/auth');
  }

  async signIn(email: string, password: string) {
    await this.page.getByPlaceholder('Enter your email').fill(email);
    await this.page.getByPlaceholder('Enter your password').fill(password);
    await this.page.getByText('Sign In', { exact: true }).click();
  }

  async signUp(email: string, password: string, metadata?: any) {
    await this.page.getByPlaceholder('Enter your email').fill(email);
    await this.page.getByPlaceholder('Enter your password').fill(password);
    
    if (metadata?.firstName) {
      const firstNameField = this.page.getByPlaceholder('First name');
      if (await firstNameField.isVisible()) {
        await firstNameField.fill(metadata.firstName);
      }
    }
    
    await this.page.getByText('Sign Up', { exact: true }).click();
  }

  async waitForAuth() {
    await this.page.waitForURL('/dashboard', { timeout: 15000 });
  }
}

export class DashboardPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async sendChatMessage(message: string) {
    const chatInput = this.page.getByPlaceholder('Type your message...');
    await chatInput.fill(message);
    await this.page.getByRole('button', { name: /send/i }).click();
  }

  async waitForAIResponse(timeout = 30000) {
    // Wait for any text response (this could be more specific)
    await this.page.locator('[data-testid="chat-message"]').last().waitFor({ timeout });
  }

  async signOut() {
    await this.page.getByText('Sign Out').click();
  }
}

export class PolicyGenerationFlow {
  constructor(private page: any) {}

  async generatePolicy(policyType: string) {
    const chatInput = this.page.getByPlaceholder('Type your message...');
    await chatInput.fill(`Generate a ${policyType} policy`);
    await this.page.getByRole('button', { name: /send/i }).click();
  }

  async fillMissingFields(data: Record<string, string>) {
    for (const [field, value] of Object.entries(data)) {
      const fieldInput = this.page.getByLabel(new RegExp(field, 'i')).first();
      if (await fieldInput.isVisible()) {
        await fieldInput.fill(value);
      }
    }
    
    const submitButton = this.page.getByRole('button', { name: /submit|continue/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
  }

  async savePolicy() {
    const saveButton = this.page.getByRole('button', { name: /save policy/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
      return true;
    }
    return false;
  }

  async downloadPolicy() {
    const downloadButton = this.page.getByRole('button', { name: /download/i });
    if (await downloadButton.isVisible()) {
      const downloadPromise = this.page.waitForEvent('download');
      await downloadButton.click();
      return await downloadPromise;
    }
    return null;
  }
}