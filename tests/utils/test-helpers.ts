import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async loginAsUser(email: string = 'test@example.com', password: string = 'password123') {
    await this.page.goto('/auth');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async loginAsAdmin(email: string = 'admin@example.com', password: string = 'admin123') {
    await this.page.goto('/auth');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async loginAsConsultant(email: string = 'consultant@example.com', password: string = 'consultant123') {
    await this.page.goto('/auth');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/');
  }
}

export class ChatHelper {
  constructor(private page: Page) {}

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    await this.page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });
  }

  async escalateCurrentConversation(reason: string) {
    await this.page.click('[data-testid="escalate-button"]');
    await this.page.fill('[data-testid="escalation-reason"]', reason);
    await this.page.click('[data-testid="submit-escalation"]');
    await this.page.waitForSelector('[data-testid="escalation-success"]');
  }

  async rateMessage(rating: 'up' | 'down') {
    const buttonId = rating === 'up' ? 'thumbs-up-button' : 'thumbs-down-button';
    await this.page.click(`[data-testid="${buttonId}"]`);
    await this.page.waitForSelector('[data-testid="rating-confirmation"]');
  }

  async getLastAIResponse() {
    const responses = await this.page.locator('[data-testid="ai-response"]');
    const count = await responses.count();
    if (count > 0) {
      return await responses.nth(count - 1).textContent();
    }
    return null;
  }
}

export class CVEHelper {
  constructor(private page: Page) {}

  async lookupCVE(cveId: string) {
    await this.page.goto('/cve-security');
    await this.page.fill('[data-testid="cve-input"]', cveId);
    await this.page.click('[data-testid="lookup-button"]');
    await this.page.waitForSelector('[data-testid="cve-results"]');
  }

  async getLatestCVEs() {
    await this.page.goto('/cve-security');
    await this.page.click('[data-testid="latest-cves-tab"]');
    await this.page.waitForSelector('[data-testid="latest-cves-list"]');
    
    const cveItems = await this.page.locator('[data-testid="cve-item"]');
    const count = await cveItems.count();
    const cves = [];
    
    for (let i = 0; i < count; i++) {
      const cveText = await cveItems.nth(i).textContent();
      cves.push(cveText);
    }
    
    return cves;
  }
}

export class AdminHelper {
  constructor(private page: Page) {}

  async gotoAdminDashboard() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async viewUsers() {
    await this.gotoAdminDashboard();
    await this.page.click('[data-testid="users-tab"]');
    await this.page.waitForSelector('[data-testid="users-list"]');
  }

  async viewEscalations() {
    await this.gotoAdminDashboard();
    await this.page.click('[data-testid="escalations-tab"]');
    await this.page.waitForSelector('[data-testid="escalations-list"]');
  }
}

export class PerformanceHelper {
  static async measurePageLoad(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  static async measureAPIResponse(page: Page, apiCall: () => Promise<any>): Promise<number> {
    const startTime = Date.now();
    await apiCall();
    return Date.now() - startTime;
  }

  static async monitorMemoryUsage(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory?.usedJSHeapSize || 0,
        totalJSHeapSize: memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0
      };
    });
  }
}

export class SecurityHelper {
  static generateXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      '<body onload="alert(\'XSS\')">',
      '<input onfocus="alert(\'XSS\')" autofocus>',
      '<video><source onerror="alert(\'XSS\')">'
    ];
  }

  static generateSQLInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "') OR ('1'='1",
      "1; DELETE FROM users --",
      "' OR '1'='1' /*",
      "' OR 'a'='a"
    ];
  }

  static async testFormValidation(page: Page, formSelector: string, invalidInputs: Record<string, string[]>) {
    for (const [fieldSelector, invalidValues] of Object.entries(invalidInputs)) {
      for (const value of invalidValues) {
        await page.fill(fieldSelector, value);
        await page.click(`${formSelector} [type="submit"]`);
        
        // Should show validation error
        const hasError = await page.isVisible('[data-testid="validation-error"]');
        expect(hasError).toBe(true);
      }
    }
  }
}

export class EscalationHelper {
  constructor(private page: Page) {}

  async createEscalation(reason: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    await this.page.goto('/chat');
    
    // Start a conversation first
    await this.page.fill('[data-testid="chat-input"]', 'I need help with a security issue');
    await this.page.click('[data-testid="send-button"]');
    await this.page.waitForSelector('[data-testid="ai-response"]');
    
    // Escalate
    await this.page.click('[data-testid="escalate-button"]');
    await this.page.fill('[data-testid="escalation-reason"]', reason);
    await this.page.selectOption('[data-testid="priority-select"]', priority);
    await this.page.click('[data-testid="submit-escalation"]');
    await this.page.waitForSelector('[data-testid="escalation-success"]');
  }

  async viewEscalationQueue() {
    await this.page.goto('/dashboard/escalation-queue');
    await this.page.waitForSelector('[data-testid="escalation-queue"]');
  }
}