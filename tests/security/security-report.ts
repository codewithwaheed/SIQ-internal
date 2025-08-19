import { test, expect } from "@playwright/test";
import { writeFileSync } from "fs";

interface SecurityTest {
  category: string;
  testName: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

interface SecurityReport {
  timestamp: string;
  overallStatus: "SECURE" | "NEEDS_ATTENTION" | "CRITICAL_ISSUES";
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  categories: {
    authentication: SecurityTest[];
    authorization: SecurityTest[];
    inputValidation: SecurityTest[];
    dataProtection: SecurityTest[];
    infrastructure: SecurityTest[];
    cveIntegration: SecurityTest[];
  };
  recommendations: string[];
}

test.describe("Security Report Generation", () => {
  test("generate comprehensive security report", async ({ page, request }) => {
    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      overallStatus: "SECURE",
      summary: { totalTests: 0, passed: 0, failed: 0, warnings: 0 },
      categories: {
        authentication: [],
        authorization: [],
        inputValidation: [],
        dataProtection: [],
        infrastructure: [],
        cveIntegration: [],
      },
      recommendations: [],
    };

    // Authentication Tests
    try {
      await page.goto("/auth");
      await page.fill('[data-testid="email-input"]', "wronguser@example.com");
      await page.fill('[data-testid="password-input"]', "wrongpassword");
      await page.click('[data-testid="login-button"]');

      const hasError = await page.waitForSelector(
        '[data-testid="error-message"]',
        { timeout: 5000 },
      );
      report.categories.authentication.push({
        category: "Authentication",
        testName: "Invalid Login Rejection",
        status: hasError ? "PASS" : "FAIL",
        details: "System properly rejects invalid login attempts",
        severity: hasError ? "LOW" : "HIGH",
      });
    } catch (error) {
      report.categories.authentication.push({
        category: "Authentication",
        testName: "Invalid Login Rejection",
        status: "FAIL",
        details: `Authentication test failed: ${error}`,
        severity: "HIGH",
      });
    }

    // Authorization Tests
    try {
      const response = await request.get("/api/admin/users");
      report.categories.authorization.push({
        category: "Authorization",
        testName: "Admin Endpoint Protection",
        status:
          response.status() === 401 || response.status() === 403
            ? "PASS"
            : "FAIL",
        details: `Admin endpoint returned status: ${response.status()}`,
        severity:
          response.status() === 401 || response.status() === 403
            ? "LOW"
            : "CRITICAL",
      });
    } catch (error) {
      report.categories.authorization.push({
        category: "Authorization",
        testName: "Admin Endpoint Protection",
        status: "WARNING",
        details: `Could not test admin endpoint: ${error}`,
        severity: "MEDIUM",
      });
    }

    // Input Validation Tests
    const xssPayload = '<script>alert("xss")</script>';
    try {
      const response = await request.get(
        `/api/cve/${encodeURIComponent(xssPayload)}`,
      );
      report.categories.inputValidation.push({
        category: "Input Validation",
        testName: "XSS Prevention in CVE Endpoint",
        status: response.status() === 400 ? "PASS" : "WARNING",
        details: `CVE endpoint validation response: ${response.status()}`,
        severity: response.status() === 400 ? "LOW" : "MEDIUM",
      });
    } catch (error) {
      report.categories.inputValidation.push({
        category: "Input Validation",
        testName: "XSS Prevention in CVE Endpoint",
        status: "FAIL",
        details: `Input validation test failed: ${error}`,
        severity: "HIGH",
      });
    }

    // CVE Integration Tests
    try {
      const response = await request.get("/api/cve/CVE-2021-44228");
      const isValidResponse =
        response.status() === 200 || response.status() === 401;

      report.categories.cveIntegration.push({
        category: "CVE Integration",
        testName: "CVE API Endpoint Functionality",
        status: isValidResponse ? "PASS" : "FAIL",
        details: `CVE endpoint returned status: ${response.status()}`,
        severity: isValidResponse ? "LOW" : "MEDIUM",
      });

      if (response.ok()) {
        const data = await response.json();
        const hasValidStructure = data.cve && data.cve.id;

        report.categories.cveIntegration.push({
          category: "CVE Integration",
          testName: "CVE Data Structure Validation",
          status: hasValidStructure ? "PASS" : "FAIL",
          details: "CVE response contains expected data structure",
          severity: hasValidStructure ? "LOW" : "MEDIUM",
        });
      }
    } catch (error) {
      report.categories.cveIntegration.push({
        category: "CVE Integration",
        testName: "CVE API Endpoint Functionality",
        status: "FAIL",
        details: `CVE integration test failed: ${error}`,
        severity: "HIGH",
      });
    }

    // Data Protection Tests
    try {
      await page.goto("/auth");
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="password-input"]', "password123");
      await page.click('[data-testid="login-button"]');
      await page.waitForURL("/dashboard");

      await page.goto("/chat");
      await page.fill(
        '[data-testid="chat-input"]',
        "My credit card is 1234-5678-9012-3456",
      );
      await page.click('[data-testid="send-button"]');

      await page.waitForSelector('[data-testid="user-message"]');
      const messageContent = await page.textContent(
        '[data-testid="user-message"]',
      );

      report.categories.dataProtection.push({
        category: "Data Protection",
        testName: "Sensitive Data Handling",
        status: messageContent?.includes("1234-5678-9012-3456")
          ? "WARNING"
          : "PASS",
        details: "Check for proper handling of sensitive data in messages",
        severity: messageContent?.includes("1234-5678-9012-3456")
          ? "MEDIUM"
          : "LOW",
      });
    } catch (error) {
      report.categories.dataProtection.push({
        category: "Data Protection",
        testName: "Sensitive Data Handling",
        status: "FAIL",
        details: `Data protection test failed: ${error}`,
        severity: "HIGH",
      });
    }

    // Infrastructure Tests
    try {
      const response = await page.goto("/");
      const headers = response?.headers();

      const hasSecurityHeaders = !!(
        headers?.["x-frame-options"] ||
        headers?.["x-content-type-options"] ||
        headers?.["strict-transport-security"]
      );

      report.categories.infrastructure.push({
        category: "Infrastructure",
        testName: "Security Headers",
        status: hasSecurityHeaders ? "PASS" : "WARNING",
        details: "Check for presence of security headers",
        severity: hasSecurityHeaders ? "LOW" : "MEDIUM",
      });
    } catch (error) {
      report.categories.infrastructure.push({
        category: "Infrastructure",
        testName: "Security Headers",
        status: "FAIL",
        details: `Infrastructure test failed: ${error}`,
        severity: "MEDIUM",
      });
    }

    // Calculate summary
    const allTests = Object.values(report.categories).flat();
    report.summary.totalTests = allTests.length;
    report.summary.passed = allTests.filter((t) => t.status === "PASS").length;
    report.summary.failed = allTests.filter((t) => t.status === "FAIL").length;
    report.summary.warnings = allTests.filter(
      (t) => t.status === "WARNING",
    ).length;

    // Determine overall status
    const criticalIssues = allTests.filter(
      (t) => t.severity === "CRITICAL" && t.status === "FAIL",
    ).length;
    const highIssues = allTests.filter(
      (t) => t.severity === "HIGH" && t.status === "FAIL",
    ).length;

    if (criticalIssues > 0) {
      report.overallStatus = "CRITICAL_ISSUES";
    } else if (highIssues > 0 || report.summary.failed > 0) {
      report.overallStatus = "NEEDS_ATTENTION";
    } else {
      report.overallStatus = "SECURE";
    }

    // Generate recommendations
    if (report.summary.failed > 0) {
      report.recommendations.push(
        "Address all failed security tests before production deployment",
      );
    }
    if (
      allTests.some(
        (t) => t.testName.includes("Security Headers") && t.status !== "PASS",
      )
    ) {
      report.recommendations.push(
        "Implement comprehensive security headers (CSP, HSTS, etc.)",
      );
    }
    if (
      allTests.some(
        (t) => t.testName.includes("Input Validation") && t.status !== "PASS",
      )
    ) {
      report.recommendations.push(
        "Strengthen input validation and sanitization",
      );
    }
    if (
      allTests.some((t) => t.testName.includes("CVE") && t.status !== "PASS")
    ) {
      report.recommendations.push(
        "Verify CVE API integration and error handling",
      );
    }

    // Save report
    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync("tests/reports/security-audit-report.json", reportJson);

    // Create HTML report
    const htmlReport = generateHTMLReport(report);
    writeFileSync("tests/reports/security-audit-report.html", htmlReport);

    console.log(`Security Report Generated: ${report.overallStatus}`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Warnings: ${report.summary.warnings}`);

    // Test should pass only if no critical issues
    expect(criticalIssues).toBe(0);
  });
});

function generateHTMLReport(report: SecurityReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .status-secure { color: green; }
        .status-warning { color: orange; }
        .status-critical { color: red; }
        .category { margin: 20px 0; }
        .test { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .test-pass { border-left-color: green; }
        .test-fail { border-left-color: red; }
        .test-warning { border-left-color: orange; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Audit Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Overall Status:</strong> 
            <span class="status-${report.overallStatus.toLowerCase().replace("_", "-")}">${report.overallStatus}</span>
        </p>
        <p><strong>Summary:</strong> ${report.summary.passed}/${report.summary.totalTests} tests passed, 
           ${report.summary.failed} failed, ${report.summary.warnings} warnings</p>
    </div>

    ${Object.entries(report.categories)
      .map(
        ([categoryName, tests]) => `
        <div class="category">
            <h2>${categoryName.toUpperCase()}</h2>
            ${tests
              .map(
                (test) => `
                <div class="test test-${test.status.toLowerCase()}">
                    <h3>${test.testName}</h3>
                    <p><strong>Status:</strong> ${test.status}</p>
                    <p><strong>Severity:</strong> ${test.severity}</p>
                    <p>${test.details}</p>
                </div>
            `,
              )
              .join("")}
        </div>
    `,
      )
      .join("")}

    ${
      report.recommendations.length > 0
        ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
            </ul>
        </div>
    `
        : ""
    }
</body>
</html>`;
}
