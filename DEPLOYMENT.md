# SentrIQ Secure Deployment Guide

## Overview

This guide outlines the secure deployment pipeline for SentrIQ, ensuring all sensitive data is protected and best security practices are followed.

## Platform Architecture

- **Frontend**: React/Vite application deployed on Vercel
- **Backend**: Supabase (database, authentication, edge functions)
- **Payment Processing**: Stripe integration
- **AI Services**: OpenAI API integration

## Environment Setup

### Required Environment Variables

#### Frontend (Vercel) - Public Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_... for staging)
```

#### Backend (Supabase Edge Functions) - Private Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for staging)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Environment Configuration

#### Production Environment

1. **Vercel Project Settings**:
   - Navigate to your project in Vercel dashboard
   - Go to Settings → Environment Variables
   - Add all `VITE_*` variables for Production environment
   - Ensure sensitive variables (without VITE\_ prefix) are NOT added to frontend

2. **Supabase Edge Functions**:
   - Access Supabase dashboard → Settings → Edge Functions
   - Configure secrets in Environment Variables section
   - All backend secrets are stored securely and never exposed to client

#### Staging Environment

- Use separate Supabase project for staging
- Use Stripe test mode keys
- Configure separate OAuth providers for testing

## Security Configuration

### HTTPS Enforcement

- Automatic SSL certificates via Vercel
- HTTP to HTTPS redirects configured in `vercel.json`
- HSTS headers enforced for browser security

### Security Headers

The following security headers are automatically applied:

- **Content Security Policy**: Restricts resource loading to trusted sources
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict-Transport-Security**: Enforces HTTPS connections
- **Cross-Origin Policies**: Protects against cross-origin attacks

### Permissions Policy

Restricted browser features:

- Camera access disabled
- Microphone access disabled
- Geolocation access disabled
- Payment API restricted
- USB access disabled

## Deployment Pipeline

### Automatic Deployment (Recommended)

1. **GitHub Integration**:

   ```bash
   # Connect repository to Vercel
   # Every push to main branch triggers deployment
   git push origin main
   ```

2. **Branch Strategy**:
   - `main` → Production deployment
   - `staging` → Staging environment (optional)
   - Feature branches → Preview deployments

### Manual Deployment

1. **Build locally**:

   ```bash
   npm install
   npm run build
   ```

2. **Deploy via Vercel CLI**:
   ```bash
   npx vercel --prod
   ```

## Pre-Deployment Checklist

### Security Verification

- [ ] No secrets in Git repository
- [ ] All environment variables configured
- [ ] HTTPS enforcement working
- [ ] Security headers properly set
- [ ] CSP policy allows required resources only

### Functionality Testing

- [ ] Authentication flow works
- [ ] File upload functionality
- [ ] Payment processing
- [ ] AI chat responses
- [ ] Mobile responsiveness
- [ ] Error handling

### Performance Optimization

- [ ] Bundle size optimized
- [ ] Images compressed
- [ ] Caching headers configured
- [ ] CDN properly configured

## Monitoring and Maintenance

### Error Monitoring

```bash
# Vercel provides built-in analytics and error tracking
# Access via Vercel dashboard → Analytics/Functions
```

### Log Monitoring

- Supabase provides real-time logs for edge functions
- Vercel provides deployment and runtime logs
- Set up alerts for critical errors

### Security Monitoring

```bash
# Regular security audits
npm audit
npm audit fix

# Dependency updates
npm update
```

## Access Control

### Team Access

- Limit Vercel project access to essential team members
- Enable 2FA for all team accounts
- Use principle of least privilege

### API Key Rotation

1. Generate new keys in respective services
2. Update environment variables
3. Deploy to apply changes
4. Revoke old keys

## Backup and Recovery

### Database Backups

- Supabase provides automatic daily backups
- Enable point-in-time recovery if needed

### Code Repository

- Ensure Git repository has proper access controls
- Regular backups via GitHub

## Compliance Considerations

### Data Protection

- All data encrypted in transit (HTTPS)
- All data encrypted at rest (Supabase)
- Regular security audits

### Audit Logging

- User actions logged via audit_logs table
- Authentication events tracked
- File upload/download activities monitored

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**:
   - Verify variable names (VITE\_ prefix for frontend)
   - Check environment scope (Production/Preview)
   - Redeploy after adding variables

2. **CSP Violations**:
   - Check browser console for blocked resources
   - Update CSP policy in vercel.json
   - Test with staging environment first

3. **CORS Issues**:
   - Verify Supabase URL configuration
   - Check API endpoints allow origin domain
   - Ensure OAuth redirect URLs are whitelisted

### Emergency Procedures

1. **Immediate Security Issue**:

   ```bash
   # Disable deployment
   vercel project ls
   vercel project rm [project-name]
   ```

2. **Rollback Deployment**:
   ```bash
   # Via Vercel dashboard or CLI
   vercel rollback [deployment-url]
   ```

## Support Contacts

- **Technical Lead**: [Contact Information]
- **Security Team**: [Contact Information]
- **DevOps**: [Contact Information]

---

**Last Updated**: $(date)
**Next Review**: [Schedule regular reviews]
