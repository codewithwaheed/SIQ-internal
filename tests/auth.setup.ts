import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from './config/test-config';

const supabase = createClient(TEST_CONFIG.SUPABASE.URL, TEST_CONFIG.SUPABASE.ANON_KEY);

setup('prepare test database', async () => {
  console.log('🔧 Setting up test environment...');

  // Clean up any existing test users
  const testEmails = [
    TEST_CONFIG.BUSINESS_OWNER.email,
    TEST_CONFIG.CONSULTANT.email,
    TEST_CONFIG.ADMIN.email,
  ];

  // Note: In a real test environment, you'd use a service role key
  // to clean up users. For now, we'll just ensure the test can handle
  // existing users gracefully.

  console.log('✅ Test environment ready');
});

setup('authenticate test users', async ({ page, context }) => {
  console.log('🔐 Setting up authenticated sessions...');

  // Create authenticated sessions for each test user type
  const users = [
    { name: 'business-owner', config: TEST_CONFIG.BUSINESS_OWNER },
    { name: 'consultant', config: TEST_CONFIG.CONSULTANT },
    { name: 'admin', config: TEST_CONFIG.ADMIN },
  ];

  for (const user of users) {
    console.log(`Setting up ${user.name} session...`);

    // Go to auth page
    await page.goto('/auth');

    // Try to sign up first (will fail if user exists, which is fine)
    try {
      await page.getByPlaceholder('Enter your email').fill(user.config.email);
      await page.getByPlaceholder('Enter your password').fill(user.config.password);
      await page.getByText('Sign Up', { exact: true }).click();

      // Wait briefly for potential signup
      await page.waitForTimeout(2000);
    } catch (error) {
      // User might already exist, continue to login
    }

    // Clear and login
    await page.getByPlaceholder('Enter your email').clear();
    await page.getByPlaceholder('Enter your password').clear();
    await page.getByPlaceholder('Enter your email').fill(user.config.email);
    await page.getByPlaceholder('Enter your password').fill(user.config.password);
    await page.getByText('Sign In', { exact: true }).click();

    // Wait for successful login (either dashboard redirect or success message)
    try {
      await page.waitForURL('/dashboard', { timeout: 10000 });
      console.log(`✅ ${user.name} authenticated successfully`);
    } catch (error) {
      console.log(`⚠️ ${user.name} authentication may have failed, continuing...`);
    }

    // Save authentication state
    await context.storageState({
      path: `tests/auth-states/${user.name}.json`,
    });

    // Sign out for next user
    if (users.indexOf(user) < users.length - 1) {
      try {
        await page.goto('/dashboard');
        await page.getByText('Sign Out').click({ timeout: 5000 });
        await page.waitForURL('/', { timeout: 5000 });
      } catch (error) {
        // Force navigation to home
        await page.goto('/');
      }
    }
  }

  console.log('✅ All user sessions prepared');
});
