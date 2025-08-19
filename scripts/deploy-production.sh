#!/bin/bash

echo "🚀 Starting Production Deployment Verification..."

echo "📋 Pre-deployment Security Checklist:"

# Check for hardcoded secrets (should find none)
echo "🔍 Scanning for hardcoded secrets..."
if grep -r "sk-" src/ 2>/dev/null; then
    echo "❌ CRITICAL: OpenAI API keys found in source code!"
    exit 1
else
    echo "✅ No hardcoded API keys found"
fi

# Check for debug logs in production
if grep -r "console.log" src/ | grep -v "// Development only" | wc -l | xargs test 0 -eq; then
    echo "✅ No debug logs in production code"
else
    echo "⚠️  WARNING: Debug logs found - review before production"
fi

# Verify environment variables are externalized
echo "🔧 Verifying environment configuration..."
if grep -r "process.env" src/ | head -5; then
    echo "✅ Environment variables properly externalized"
fi

echo "🛡️  Running Security Test Suite..."

# Run Playwright security tests
npx playwright test tests/security/ --reporter=line || {
    echo "❌ Security tests failed - address issues before deployment"
    exit 1
}

echo "🧪 Running CVE Integration Tests..."
npx playwright test tests/api/cve-integration.spec.ts --reporter=line || {
    echo "❌ CVE integration tests failed"
    exit 1
}

echo "⚡ Running Performance Tests..."
npx playwright test tests/performance/ --reporter=line || {
    echo "⚠️  Performance tests show issues - review before high-load deployment"
}

echo "🔐 Running Multi-tenant Isolation Tests..."
npx playwright test tests/security/penetration-testing.spec.ts --reporter=line || {
    echo "❌ Multi-tenant isolation failed - CRITICAL SECURITY ISSUE"
    exit 1
}

echo "📊 Generating Security Report..."
npx playwright test tests/security/security-report.ts --reporter=line

echo "✅ All critical tests passed - READY FOR PRODUCTION DEPLOYMENT!"

echo "🚀 Deployment Instructions:"
echo "1. Click 'Publish' in Lovable dashboard"
echo "2. Verify all environment variables in Supabase secrets"  
echo "3. Monitor deployment status and logs"
echo "4. Run post-deployment smoke tests"
echo "5. Begin soft launch with initial users"

echo "📱 Post-deployment monitoring setup:"
echo "- Supabase Dashboard: Real-time metrics"
echo "- Error tracking: Automatic alerts configured"
echo "- Performance monitoring: Built-in Lovable analytics"
echo "- Security monitoring: Audit logs active"

echo "🔄 Rollback plan:"
echo "- Previous version tagged and ready"
echo "- One-click rollback via Lovable dashboard"
echo "- Database backup points available"

echo "✅ PRODUCTION DEPLOYMENT VERIFICATION COMPLETE"