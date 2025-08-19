# SentrIQ API Documentation

## Overview

SentrIQ provides a comprehensive REST API for cybersecurity compliance automation, CVE intelligence, and expert consultation services.

**Base URL**: `https://your-domain.com/api`  
**Authentication**: Bearer Token (JWT)  
**Content-Type**: `application/json`

## Authentication

### Authentication Required

All API endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Getting Authentication Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "business_owner"
  }
}
```

## Core API Endpoints

### CVE Intelligence

#### Get CVE Details

Retrieve detailed information about a specific CVE from the National Vulnerability Database.

```http
GET /api/cve/{cve_id}
```

**Parameters:**

- `cve_id` (string, required): CVE identifier in format CVE-YYYY-NNNNN

**Example:**

```http
GET /api/cve/CVE-2021-44228
```

**Response:**

```json
{
  "success": true,
  "cve": {
    "id": "CVE-2021-44228",
    "description": "Apache Log4j2 2.0-beta9 through 2.15.0...",
    "published": "2021-12-10T10:15:09.000Z",
    "modified": "2021-12-10T10:15:09.000Z",
    "cvssV3": {
      "baseScore": 10.0,
      "baseSeverity": "CRITICAL",
      "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"
    },
    "cwe": ["CWE-502", "CWE-400"],
    "references": ["https://nvd.nist.gov/vuln/detail/CVE-2021-44228"]
  },
  "cached": false
}
```

#### Get Latest CVEs

Retrieve the most recent vulnerabilities from the past specified days.

```http
GET /api/cve/latest?days=7&limit=20
```

**Parameters:**

- `days` (integer, optional): Number of days to look back (default: 7)
- `limit` (integer, optional): Maximum number of CVEs to return (default: 20)

### Chat & AI Assistance

#### Send Chat Message

Send a message to the AI assistant for cybersecurity guidance.

```http
POST /api/chat
```

**Request Body:**

```json
{
  "message": "How do I implement NIST 800-171 controls?",
  "conversation_id": "uuid-optional",
  "context": {
    "framework": "NIST_800_171",
    "industry": "healthcare"
  }
}
```

**Response:**

```json
{
  "success": true,
  "response": "To implement NIST 800-171 controls...",
  "conversation_id": "uuid",
  "message_id": "uuid",
  "tokens_used": 150,
  "sources": [
    {
      "type": "knowledge_base",
      "title": "NIST 800-171 Implementation Guide"
    }
  ]
}
```

### Escalations

#### Create Escalation

Escalate a conversation to human experts.

```http
POST /api/escalations
```

**Request Body:**

```json
{
  "conversation_id": "uuid",
  "reason": "Need expert review of security architecture",
  "priority": "high",
  "context": {
    "framework": "SOC2",
    "deadline": "2024-02-15"
  }
}
```

**Response:**

```json
{
  "success": true,
  "escalation": {
    "id": "uuid",
    "status": "pending",
    "priority": "high",
    "sla_deadline": "2024-02-10T16:00:00.000Z",
    "assigned_consultant": null
  }
}
```

#### Get Escalation Status

```http
GET /api/escalations/{escalation_id}
```

### Document Management

#### Upload Document

Upload documents for AI analysis and policy generation.

```http
POST /api/documents
Content-Type: multipart/form-data

file: <binary_data>
title: "Security Policy Draft"
type: "policy"
```

**Response:**

```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "filename": "security_policy.pdf",
    "size": 1048576,
    "status": "processing",
    "upload_url": "https://secure-url..."
  }
}
```

#### Get Document Analysis

```http
GET /api/documents/{document_id}/analysis
```

### Policy Generation

#### Generate Policy

Create compliance policies based on frameworks and requirements.

```http
POST /api/policies/generate
```

**Request Body:**

```json
{
  "framework": "NIST_800_171",
  "title": "Incident Response Policy",
  "requirements": [
    "Define incident categories",
    "Establish response procedures",
    "Include notification requirements"
  ],
  "organization": {
    "name": "Example Corp",
    "industry": "healthcare",
    "size": "50-200 employees"
  }
}
```

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

### Limits by Endpoint

- **CVE Lookup**: 100 requests per minute
- **Chat Messages**: 50 requests per minute
- **Document Upload**: 10 requests per minute
- **Policy Generation**: 20 requests per hour

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

### Escalation Status Updates

Receive notifications when escalation status changes.

**Endpoint Configuration:**

```http
POST /your-webhook-endpoint
```

**Payload:**

```json
{
  "event": "escalation.status_changed",
  "escalation_id": "uuid",
  "status": "assigned",
  "consultant": {
    "id": "uuid",
    "name": "Expert Consultant"
  },
  "timestamp": "2024-02-10T10:00:00.000Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SentrIQClient } from "@sentriq/sdk";

const client = new SentrIQClient({
  apiKey: "your-api-key",
  baseURL: "https://api.sentriq.com",
});

// Get CVE details
const cve = await client.cve.get("CVE-2021-44228");

// Send chat message
const response = await client.chat.send({
  message: "How do I secure my API endpoints?",
  context: { framework: "OWASP" },
});

// Create escalation
const escalation = await client.escalations.create({
  conversationId: "uuid",
  reason: "Need security architecture review",
  priority: "high",
});
```

### Python

```python
from sentriq import SentrIQClient

client = SentrIQClient(
    api_key='your-api-key',
    base_url='https://api.sentriq.com'
)

# Get CVE details
cve = client.cve.get('CVE-2021-44228')

# Send chat message
response = client.chat.send(
    message='How do I implement Zero Trust?',
    context={'framework': 'NIST'}
)
```

## Testing

### Test Environment

**Base URL**: `https://staging-api.sentriq.com`

### Test Credentials

```
Email: test@example.com
Password: TestPassword123!
```

### Sample CVE IDs for Testing

- `CVE-2021-44228` (Log4Shell - Critical)
- `CVE-2021-34527` (PrintNightmare - High)
- `CVE-2021-26855` (Exchange Server - Critical)

## Support

### API Support

- **Email**: api-support@sentriq.com
- **Documentation**: https://docs.sentriq.com
- **Status Page**: https://status.sentriq.com

### Response Times

- **Critical Issues**: 2 hours
- **General Support**: 24 hours
- **Feature Requests**: 72 hours
