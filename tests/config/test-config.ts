// Test configuration and utilities
export const TEST_CONFIG = {
  // Test user credentials
  BUSINESS_OWNER: {
    email: 'test-business@sentriq.test',
    password: 'TestPassword123!',
    role: 'business_owner'
  },
  CONSULTANT: {
    email: 'test-consultant@sentriq.test', 
    password: 'TestPassword123!',
    role: 'consultant'
  },
  ADMIN: {
    email: 'test-admin@sentriq.test',
    password: 'TestPassword123!',
    role: 'admin'
  },
  
  // Test timeouts
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    VERY_LONG: 60000
  },
  
  // URLs
  URLS: {
    HOME: '/',
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    ADMIN: '/users'
  },
  
  // Supabase test configuration
  SUPABASE: {
    URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
    ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
  }
};

// Test data for policy generation
export const TEST_POLICY_DATA = {
  business_name: 'Test Corporation Inc',
  contact_email: 'contact@testcorp.com',
  physical_address: '123 Test Street, Test City, TC 12345',
  min_password_length: '12',
  password_rotation_days: '90',
  mfa_required: 'is required for all privileged accounts'
};

// Mock API responses for testing
export const MOCK_RESPONSES = {
  POLICY_GENERATION: {
    success: true,
    policy: 'Generated test policy content...',
    isComplete: true,
    missingFields: []
  },
  
  SUBSCRIPTION_CHECK: {
    subscribed: true,
    subscription_tier: 'Pro',
    subscription_end: null
  }
};