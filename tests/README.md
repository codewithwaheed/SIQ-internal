# 🧪 End-to-End Testing Guide

## Overview

This project uses **Playwright** for comprehensive end-to-end testing to ensure all critical user flows work correctly and prevent regressions.

## 🚀 Running Tests

### Local Development

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/auth/auth-flow.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run tests for specific browser
npx playwright test --project=chromium
```

### CI/CD Integration

Tests automatically run on:

- Every pull request
- Main branch commits
- Scheduled nightly runs

## 📁 Test Structure

```
tests/
├── config/
│   └── test-config.ts          # Test configuration and constants
├── auth/
│   └── auth-flow.spec.ts       # Authentication & authorization tests
├── features/
│   ├── chat-interface.spec.ts  # AI chat functionality
│   └── policy-generation.spec.ts # Policy generation workflow
├── security/
│   ├── rbac.spec.ts           # Role-based access control
│   └── security-guard.spec.ts  # Security guard protection
├── regression/
│   └── ui-regression.spec.ts   # UI/UX regression tests
├── e2e/
│   └── critical-journeys.spec.ts # Complete user workflows
├── utils/
│   └── page-objects.ts         # Reusable page object models
├── auth-states/               # Stored authentication states
├── auth.setup.ts              # Test user authentication
└── cleanup.teardown.ts        # Test cleanup
```

## 🔐 Test Users & Authentication

### Pre-configured Test Users

- **Business Owner**: `test-business@sentriq.test`
- **Consultant**: `test-consultant@sentriq.test`
- **Admin**: `test-admin@sentriq.test`

### Authentication Setup

Tests use stored authentication states to avoid login on every test:

```typescript
// Use pre-authenticated state
test.use({ storageState: "tests/auth-states/business-owner.json" });
```

## 🧪 Test Categories

### 1. Authentication Tests (`tests/auth/`)

- Login/logout flows
- Password validation
- MFA challenges
- Session management
- Protected route access

### 2. Feature Tests (`tests/features/`)

- **Chat Interface**: Message sending, AI responses, loading states
- **Policy Generation**: Template selection, field collection, policy creation
- **Document Upload**: File validation, upload flow, processing

### 3. Security Tests (`tests/security/`)

- **RBAC**: Role-based route protection, permission enforcement
- **Security Guard**: Blocked request patterns, violation handling
- **Input Validation**: XSS prevention, SQL injection, rate limiting

### 4. Regression Tests (`tests/regression/`)

- **Mobile Responsiveness**: Mobile navigation, touch interactions
- **Accessibility**: ARIA labels, keyboard navigation, screen readers
- **Performance**: Load times, memory usage, large data handling

### 5. End-to-End Tests (`tests/e2e/`)

- **Critical Journeys**: Complete user workflows from start to finish
- **Cross-browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Mobile Experience**: iOS Safari, Android Chrome

## 📊 Test Data Management

### Configuration

```typescript
// tests/config/test-config.ts
export const TEST_CONFIG = {
  BUSINESS_OWNER: {
    email: "test-business@sentriq.test",
    password: "TestPassword123!",
    role: "business_owner",
  },
  // ... other test users
};
```

### Mock Data

```typescript
export const TEST_POLICY_DATA = {
  business_name: "Test Corporation Inc",
  contact_email: "contact@testcorp.com",
  min_password_length: "12",
  // ... other policy fields
};
```

## 🔧 Page Object Model

Reusable page objects for common workflows:

```typescript
import { AuthPage, DashboardPage } from "../utils/page-objects";

test("user can generate policy", async ({ page }) => {
  const authPage = new AuthPage(page);
  const dashboardPage = new DashboardPage(page);

  await authPage.goto();
  await authPage.signIn("user@test.com", "password");
  await dashboardPage.sendChatMessage("Create password policy");
});
```

## 🚨 Critical Test Scenarios

### Authentication Security

- ✅ Unauthenticated users redirected to login
- ✅ Invalid credentials show error
- ✅ Session persistence after refresh
- ✅ Proper logout and session cleanup

### Role-Based Access

- ✅ Business owners blocked from admin routes
- ✅ Consultants can access escalation queue
- ✅ Admins have full system access
- ✅ Cross-organization data isolation

### Security Guard Protection

- ✅ Admin password requests blocked
- ✅ API key requests blocked
- ✅ Source code requests blocked
- ✅ Multiple violations trigger redirect
- ✅ Legitimate questions allowed

### Policy Generation

- ✅ Template selection works
- ✅ Missing field collection
- ✅ Policy generation completes
- ✅ Save functionality works
- ✅ Download functionality works

### Core User Flows

- ✅ New user signup → policy generation → save
- ✅ Document upload → AI analysis → response
- ✅ Expert escalation → consultant response → resolution

## 📈 Test Reporting

### HTML Reports

```bash
# Generate and open HTML report
npx playwright show-report
```

### CI Integration

- GitHub Actions automatically run tests
- Test results posted as PR comments
- Failure screenshots and videos uploaded
- Performance metrics tracked

### Coverage Tracking

- Route coverage: All protected routes tested
- Feature coverage: All major features tested
- Security coverage: All attack vectors tested
- Browser coverage: Chrome, Firefox, Safari, Mobile

## 🐛 Debugging Failed Tests

### Local Debugging

```bash
# Run with browser visible
npx playwright test --headed --project=chromium

# Debug specific test
npx playwright test tests/auth/auth-flow.spec.ts --debug

# Record new test
npx playwright codegen localhost:5173
```

### CI Debugging

- Check test artifacts in GitHub Actions
- Download failure screenshots and videos
- Review detailed logs in test report
- Use trace viewer for step-by-step analysis

### Common Issues

1. **Timing Issues**: Use `waitFor` instead of `setTimeout`
2. **Flaky Selectors**: Use stable data-testid attributes
3. **Authentication Failures**: Check test user credentials
4. **Network Issues**: Mock external API calls

## 🔄 Test Maintenance

### Adding New Tests

1. Choose appropriate test category
2. Use existing page objects when possible
3. Follow naming conventions
4. Add proper timeouts and waits
5. Include error handling

### Updating Tests

- Update when UI changes
- Maintain test user credentials
- Keep test data current
- Review and remove obsolete tests

### Performance Guidelines

- Keep tests focused and fast
- Use parallel execution
- Avoid unnecessary waits
- Mock external dependencies
- Clean up test data

## ✅ Quality Gates

### Pre-Merge Requirements

- [ ] All tests pass on target browsers
- [ ] No new accessibility violations
- [ ] Performance metrics within limits
- [ ] Security tests validate new features
- [ ] Test coverage maintained or improved

### Release Criteria

- [ ] Full test suite passes
- [ ] Critical user journeys validated
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile experience tested
- [ ] Performance benchmarks met

## 📞 Getting Help

- **Test Failures**: Check HTML report and artifacts
- **New Tests**: Follow existing patterns in similar test files
- **Playwright Issues**: https://playwright.dev/docs/
- **Team Support**: Reach out in team channels

**Happy testing! 🎯**
