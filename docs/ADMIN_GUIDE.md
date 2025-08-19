# SentrIQ Administrator Guide

## Overview
This guide provides comprehensive information for system administrators managing the SentrIQ cybersecurity compliance platform.

## Table of Contents
1. [System Administration](#system-administration)
2. [User Management](#user-management)
3. [Security Configuration](#security-configuration)
4. [Monitoring & Analytics](#monitoring--analytics)
5. [Data Management](#data-management)
6. [Backup & Recovery](#backup--recovery)
7. [Compliance Management](#compliance-management)
8. [Troubleshooting](#troubleshooting)

## System Administration

### Admin Dashboard Access
Administrators can access the admin dashboard at `/admin` with the following features:
- **System Health Monitoring**
- **User Management Panel**
- **Security Audit Logs**
- **Analytics & Reporting**
- **Configuration Management**

### Admin Privileges
Admin users have access to:
- ✅ All user conversations and escalations
- ✅ System configuration settings
- ✅ Audit logs and security events
- ✅ User role management
- ✅ Subscription and billing oversight
- ✅ Knowledge base management
- ✅ CVE database administration

## User Management

### Creating Admin Users
```sql
-- Promote existing user to admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'user-uuid';

-- Or use the admin interface:
-- Admin Dashboard → Users → Select User → Change Role → Admin
```

### User Roles and Permissions

#### Business Owner (Default)
- Access to chat interface and AI assistance
- Policy generation capabilities
- Document upload and analysis
- CVE lookup and monitoring
- Basic escalation rights

#### Consultant
- Access to escalation queue
- Ability to respond to user queries
- Enhanced knowledge base access
- Consultation scheduling tools
- Performance analytics

#### Administrator
- Full system access
- User management capabilities
- System configuration control
- Audit log access
- Security monitoring tools

### User Lifecycle Management

#### Onboarding New Users
1. **Account Creation**: Users self-register or admin invites
2. **Email Verification**: Automated verification process
3. **Profile Setup**: Business information and compliance needs
4. **Role Assignment**: Based on subscription and requirements
5. **Initial Training**: Welcome tour and feature introduction

#### Offboarding Users
1. **Account Deactivation**: Immediate access revocation
2. **Data Retention**: According to compliance requirements
3. **Knowledge Transfer**: Reassign active escalations
4. **Audit Trail**: Log all deactivation activities
5. **Data Cleanup**: Remove personal information per privacy policy

### Bulk User Operations
```bash
# Export user list
GET /api/admin/users?export=csv

# Bulk role updates
POST /api/admin/users/bulk-update
{
  "users": ["uuid1", "uuid2"],
  "role": "consultant",
  "notify": true
}

# Deactivate inactive users
POST /api/admin/users/cleanup
{
  "inactive_days": 90,
  "dry_run": true
}
```

## Security Configuration

### Authentication Settings

#### Multi-Factor Authentication (MFA)
- **Enforcement**: Can be required for admin users
- **Methods**: TOTP (Google Authenticator, Authy)
- **Backup Codes**: Generated for account recovery
- **Configuration**: Admin Dashboard → Security → MFA Settings

#### Password Policies
```javascript
// Current password requirements:
{
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  passwordHistoryCheck: 5
}
```

#### Session Management
- **Session Timeout**: 8 hours of inactivity
- **Concurrent Sessions**: 3 per user maximum
- **Device Tracking**: Monitor login locations and devices
- **Force Logout**: Admin can terminate all user sessions

### Access Control

#### Row Level Security (RLS)
All database tables implement RLS policies ensuring:
- Users can only access their own data
- Consultants can access assigned escalations
- Admins have appropriate oversight access
- Cross-tenant data isolation is enforced

#### API Security
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: All inputs sanitized and validated
- **Authentication**: JWT tokens with proper expiration
- **Authorization**: Role-based access control enforced

### Audit Logging

#### Security Events Tracked
- User authentication (success/failure)
- Role changes and privilege escalations
- Data access and modifications
- System configuration changes
- API key usage and rotation
- File uploads and downloads

#### Log Retention
- **Security Logs**: 2 years retention
- **Audit Logs**: 7 years retention (compliance)
- **Activity Logs**: 1 year retention
- **Error Logs**: 6 months retention

## Monitoring & Analytics

### System Health Dashboard
Monitor key metrics in real-time:
- **Active Users**: Current online users
- **API Response Times**: Performance metrics
- **Error Rates**: System stability indicators
- **Database Performance**: Query times and connection health
- **External Service Status**: OpenAI, NVD API availability

### User Analytics
Track platform usage and engagement:
- **Chat Volume**: Messages per day/week/month
- **CVE Lookups**: Vulnerability research patterns
- **Policy Generation**: Most requested templates
- **Escalation Patterns**: Expert consultation trends
- **User Satisfaction**: Ratings and feedback analysis

### Security Monitoring
Automated alerts for:
- **Failed Login Attempts**: Potential brute force attacks
- **Unusual Access Patterns**: Off-hours or geographic anomalies
- **Privilege Escalations**: Role changes and admin access
- **Data Exfiltration**: Large downloads or exports
- **API Abuse**: Rate limit violations

### Custom Dashboards
Create organization-specific views:
```javascript
// Example dashboard configuration
{
  "name": "SOC 2 Compliance Dashboard",
  "widgets": [
    "security_incidents",
    "access_reviews",
    "vulnerability_metrics",
    "user_training_status"
  ],
  "refresh_interval": 300,
  "access_roles": ["admin", "compliance_officer"]
}
```

## Data Management

### Database Administration

#### Backup Configuration
```yaml
# Automated backups via Supabase
backup_schedule:
  frequency: "daily"
  time: "02:00 UTC"
  retention: "30 days"
  encryption: "AES-256"
  
point_in_time_recovery:
  enabled: true
  retention: "7 days"
```

#### Performance Optimization
- **Connection Pooling**: Automatic scaling based on demand
- **Query Optimization**: Indexed searches on common patterns
- **Cache Strategy**: Redis for frequently accessed data
- **Archival Policy**: Automated cleanup of old data

### Knowledge Base Management

#### Adding New Content
1. **Admin Dashboard** → Knowledge Base → Add Document
2. **Upload** PDF, Word, or Markdown files
3. **Categorize** by framework (NIST, SOC 2, etc.)
4. **Set** visibility and access permissions
5. **Process** through AI for improved search

#### Content Categories
- **Compliance Frameworks**: NIST, SOC 2, CMMC, ISO 27001
- **Implementation Guides**: Step-by-step procedures
- **Best Practices**: Industry recommendations
- **Case Studies**: Real-world implementation examples
- **Regulatory Updates**: Latest compliance changes

### CVE Database Management

#### Sync Configuration
```javascript
// CVE data synchronization settings
{
  "source": "NVD_API",
  "sync_frequency": "hourly",
  "api_key_rotation": "monthly",
  "cache_duration": "24_hours",
  "severity_filter": "medium_and_above"
}
```

#### Data Quality Assurance
- **Validation Rules**: Ensure CVE format compliance
- **Duplicate Detection**: Prevent redundant entries
- **Source Verification**: Cross-reference multiple databases
- **Update Tracking**: Monitor data freshness

## Backup & Recovery

### Backup Strategy

#### Database Backups
- **Full Backup**: Daily at 2:00 AM UTC
- **Incremental**: Every 6 hours
- **Transaction Log**: Continuous backup
- **Geographic Distribution**: Multi-region storage

#### Application Backups
- **Configuration**: Version-controlled settings
- **Custom Code**: Git repository with tags
- **User Uploads**: Encrypted cloud storage
- **Knowledge Base**: Synchronized to multiple locations

### Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours
- **User Data**: 2 hours
- **Knowledge Base**: 6 hours
- **Reporting Systems**: 24 hours

#### Recovery Point Objectives (RPO)
- **User Data**: 15 minutes maximum loss
- **System Configuration**: 1 hour maximum loss
- **Knowledge Base**: 4 hours maximum loss

#### Recovery Procedures
1. **Assess Impact**: Determine scope of outage
2. **Activate Team**: Notify disaster recovery team
3. **Restore Systems**: Follow priority restoration order
4. **Validate Data**: Ensure data integrity post-recovery
5. **Resume Operations**: Gradual service restoration
6. **Post-Incident Review**: Document lessons learned

### Testing Schedule
- **Monthly**: Backup restoration tests
- **Quarterly**: Partial disaster recovery simulations
- **Annually**: Full disaster recovery exercise
- **Ad-hoc**: After major system changes

## Compliance Management

### Regulatory Requirements

#### Data Protection
- **GDPR Compliance**: EU user data protection
- **CCPA Compliance**: California privacy rights
- **HIPAA Compliance**: Healthcare data security
- **SOX Compliance**: Financial reporting controls

#### Industry Standards
- **SOC 2 Type II**: Annual security audits
- **ISO 27001**: Information security management
- **FedRAMP**: Government cloud security
- **PCI DSS**: Payment card industry standards

### Audit Preparation

#### Documentation Requirements
- **Policies and Procedures**: Current and version-controlled
- **System Architecture**: Network and data flow diagrams
- **Access Controls**: User roles and permission matrices
- **Incident Response**: Logs and response procedures
- **Training Records**: User security awareness training

#### Evidence Collection
```bash
# Automated audit evidence collection
./scripts/audit-evidence-generator.sh --period=quarterly

# Generates:
# - User access reports
# - Security event summaries
# - Configuration compliance checks
# - Vulnerability assessments
# - Training completion reports
```

### Compliance Monitoring

#### Automated Checks
- **Policy Compliance**: Regular policy adherence scans
- **Access Reviews**: Quarterly user permission audits
- **Vulnerability Management**: Monthly security assessments
- **Configuration Drift**: Daily configuration compliance checks

#### Reporting Dashboard
Track compliance metrics:
- **Control Effectiveness**: Implementation status
- **Risk Posture**: Current security risk level
- **Audit Readiness**: Preparation status indicators
- **Remediation Tracking**: Issue resolution progress

## Troubleshooting

### Common Administrative Issues

#### User Access Problems
**Symptoms**: Users cannot log in or access features
**Diagnosis**:
1. Check user role assignments
2. Verify account status (active/suspended)
3. Review authentication logs
4. Test MFA configuration

**Resolution**:
```sql
-- Check user status
SELECT u.email, ur.role, p.* 
FROM profiles p
JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.email = 'user@example.com';

-- Reset user password
UPDATE auth.users 
SET encrypted_password = crypt('temporary_password', gen_salt('bf'))
WHERE email = 'user@example.com';
```

#### Performance Issues
**Symptoms**: Slow response times, timeouts
**Diagnosis**:
1. Check database performance metrics
2. Review API response times
3. Monitor server resource usage
4. Analyze slow query logs

**Resolution**:
```sql
-- Identify slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check connection pool status
SELECT * FROM pg_stat_activity
WHERE state = 'active';
```

#### Data Inconsistencies
**Symptoms**: Missing data, incorrect relationships
**Diagnosis**:
1. Review recent database migrations
2. Check audit logs for data modifications
3. Validate foreign key constraints
4. Examine replication lag

**Resolution**:
```sql
-- Check constraint violations
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE NOT convalidated;

-- Validate data integrity
SELECT tablename, schemaname
FROM pg_tables
WHERE schemaname = 'public';
```

### Emergency Procedures

#### System Outage Response
1. **Immediate**: Assess scope and impact
2. **5 minutes**: Notify stakeholders and users
3. **15 minutes**: Implement temporary workarounds
4. **30 minutes**: Begin primary system restoration
5. **60 minutes**: Provide status update to users
6. **Resolution**: Conduct post-incident review

#### Security Incident Response
1. **Detection**: Automated alerts or manual reporting
2. **Containment**: Isolate affected systems
3. **Investigation**: Determine scope and root cause
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update procedures and controls

### Support Escalation

#### Internal Escalation Path
1. **Level 1**: Technical support team
2. **Level 2**: Senior administrators
3. **Level 3**: System architects
4. **Level 4**: External vendor support

#### External Support Contacts
- **Supabase Support**: platform-issues@supabase.com
- **OpenAI Support**: api-support@openai.com
- **Infrastructure**: cloud-provider-support
- **Security Vendor**: security-support@vendor.com

---

**Administrator Resources:**
- **Admin Documentation**: Complete system documentation
- **Change Management**: Procedures for system updates
- **Incident Response**: Security and operational procedures
- **Training Materials**: Administrator certification programs