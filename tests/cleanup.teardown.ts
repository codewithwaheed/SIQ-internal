import { test as teardown } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";

teardown("cleanup test data", async () => {
  console.log("🧹 Cleaning up test environment...");

  // Clean up authentication state files
  const authStatesDir = "tests/auth-states";
  if (existsSync(authStatesDir)) {
    rmSync(authStatesDir, { recursive: true, force: true });
    console.log("✅ Cleaned up authentication states");
  }

  // Clean up test results if not in CI
  if (!process.env.CI && existsSync("test-results")) {
    rmSync("test-results", { recursive: true, force: true });
    console.log("✅ Cleaned up test results");
  }

  // Reset test database if available
  try {
    if (process.env.SUPABASE_CLI_AVAILABLE) {
      execSync("supabase db reset --linked", { stdio: "inherit" });
      console.log("✅ Reset test database");
    }
  } catch (error) {
    console.log("⚠️ Could not reset database, skipping...");
  }

  console.log("✅ Cleanup complete");
});
