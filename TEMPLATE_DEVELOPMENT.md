# Policy Template Development Guide

## 🎯 Overview

SentrIQ's policy template system allows for easy extension and customization of compliance policies. This guide covers how to add new policy templates and customize existing ones.

## 📁 Template Structure

### File Organization

```
src/templates/
├── password_management.md      # Password security policies
├── acceptable_use.md          # IT resource usage policies
├── incident_response.md       # Security incident procedures
├── mobile_device.md           # Mobile device management
├── generic_template.md        # Universal policy template
└── [new_policy].md           # Your new policy template
```

### Template Format

All policy templates follow a standardized markdown format with placeholder tokens:

```markdown
# {{policy_title}}

**Introduction**  
{{intro}}

**Purpose**  
This policy establishes [specific purpose here].

**Scope**  
{{scope}}

**Policy Statement**  
{{business_name}} [policy content with {{placeholders}}]

# Additional sections...
```

## 🔧 Adding New Templates

### Step 1: Create Template File

Create a new `.md` file in `src/templates/` following naming conventions:

- Use lowercase with underscores: `data_retention.md`
- Be descriptive but concise: `remote_work_security.md`

### Step 2: Define Placeholder Tokens

Use the format `{{token_name}}` for dynamic content:

```markdown
**Data Retention Period**: {{retention_period_years}} years
**Backup Frequency**: {{backup_frequency}}
**Compliance Standard**: {{compliance_framework}}
```

### Step 3: Update Policy Generator

Add your template to the policy generator configuration:

```typescript
// src/lib/policyGenerator.ts
export const POLICY_TEMPLATES = {
  // ... existing templates
  data_retention: {
    file: "data_retention.md",
    title: "Data Retention Policy",
    description: "Defines data lifecycle and retention requirements",
  },
};
```

### Step 4: Add Default Values

Define defaults for your template tokens:

```typescript
// src/config/defaults.ts
export const POLICY_DEFAULTS = {
  // ... existing defaults
  retention_period_years: "7",
  backup_frequency: "daily",
  compliance_framework: "SOX, GDPR, CCPA",
};
```

### Step 5: Add Policy Slug Mapping

Map keywords to your policy type:

```typescript
// src/config/policySlugMap.ts
export const POLICY_SLUG_MAP: Record<PolicySlug, string[]> = {
  // ... existing mappings
  data_retention: [
    "data retention",
    "retention policy",
    "data lifecycle",
    "backup policy",
    "archive",
  ],
};
```

## 🎨 Template Customization

### Placeholder Token Types

#### Organization Information

```markdown
{{business_name}} # Company name
{{website_url}} # Company website
{{contact_email}} # Contact email
{{physical_address}} # Business address
```

#### Policy Metadata

```markdown
{{policy_title}} # Dynamic policy title
{{effective_date}} # Policy effective date
{{review_date}} # Next review date
{{version}} # Policy version number
```

#### Compliance Settings

```markdown
{{compliance_frameworks}} # Applicable frameworks
{{audit_frequency}} # How often audits occur
{{training_frequency}} # Training schedule
```

#### Technical Parameters

```markdown
{{min_password_length}} # Minimum password length
{{session_timeout}} # Session timeout duration
{{encryption_standard}} # Encryption requirements
```

### Advanced Token Features

#### Conditional Content

```markdown
{{#if_premium_tier}}
**Advanced Feature**: Premium subscribers get additional protections.
{{/if_premium_tier}}
```

#### Lists and Arrays

```markdown
**Approved Frameworks**:
{{#each compliance_frameworks}}

- {{this}}
  {{/each}}
```

#### Formatted Values

```markdown
**Password Length**: {{min_password_length}} characters minimum
**Rotation Period**: {{password_rotation_days}} days
```

## 🧱 Template Building Blocks

### Standard Policy Sections

All policies should include these sections:

1. **Introduction**: Brief overview and context
2. **Purpose**: Why this policy exists
3. **Scope**: Who and what it applies to
4. **Definitions**: Key terms and concepts
5. **Policy Statement**: Core requirements
6. **Procedures**: Step-by-step instructions
7. **Responsibilities**: Who does what
8. **Consequences**: What happens with violations
9. **References**: Related policies and standards
10. **Revision History**: Change tracking

### Example Complete Template

```markdown
# {{policy_title}}

**Introduction**  
{{intro}}

**Purpose**  
This {{policy_type}} policy establishes {{primary_objective}} to ensure {{business_name}} maintains {{compliance_objective}}.

**Scope**  
{{scope}}

**Definitions**

- **{{key_term_1}}**: {{definition_1}}
- **{{key_term_2}}**: {{definition_2}}

**Policy Statement**  
{{business_name}} requires all {{target_audience}} to {{primary_requirement}}. This includes:

1. **{{requirement_1_title}}**: {{requirement_1_detail}}
2. **{{requirement_2_title}}**: {{requirement_2_detail}}
3. **{{requirement_3_title}}**: {{requirement_3_detail}}

**Procedures**  
{{procedures_content}}

**Responsibilities**

- **{{role_1}}**: {{responsibility_1}}
- **{{role_2}}**: {{responsibility_2}}
- **{{role_3}}**: {{responsibility_3}}

**Consequences of Non-Compliance**  
{{consequences}}

**References**

- {{reference_1}}
- {{reference_2}}

**Revision History**  
| Version | Date | Author | Change |  
|---------|------|--------|--------|  
| 1.0 | {{today}} | SentrIQ AI | Initial |
```

## ⚙️ Advanced Features

### Framework-Specific Templates

Create variants for different compliance frameworks:

```
src/templates/
├── access_control/
│   ├── base.md           # Base access control policy
│   ├── nist_variant.md   # NIST-specific requirements
│   ├── iso_variant.md    # ISO 27001 specific
│   └── sox_variant.md    # SOX compliance variant
```

### Industry-Specific Customizations

```typescript
// Industry-specific template selection
const getIndustryTemplate = (industry: string, policyType: string) => {
  const industryTemplates = {
    healthcare: `${policyType}_hipaa.md`,
    finance: `${policyType}_sox.md`,
    defense: `${policyType}_cmmc.md`,
  };

  return industryTemplates[industry] || `${policyType}.md`;
};
```

### Dynamic Content Generation

```typescript
// Generate content based on organization size
const generateRequirements = (orgSize: string) => {
  if (orgSize === "enterprise") {
    return "Formal change management process required";
  } else if (orgSize === "medium") {
    return "Document all changes in change log";
  } else {
    return "Maintain basic change records";
  }
};
```

## 🧪 Testing Templates

### Template Validation

```typescript
// Test template structure
const validateTemplate = (template: string) => {
  const requiredSections = [
    "Introduction",
    "Purpose",
    "Scope",
    "Policy Statement",
    "Procedures",
  ];

  requiredSections.forEach((section) => {
    if (!template.includes(`**${section}**`)) {
      throw new Error(`Missing required section: ${section}`);
    }
  });
};
```

### Placeholder Testing

```typescript
// Ensure all placeholders have defaults
const validatePlaceholders = (template: string) => {
  const placeholders = template.match(/\{\{([a-z0-9_]+)\}\}/gi);
  placeholders?.forEach((placeholder) => {
    const fieldName = placeholder.replace(/[{}]/g, "");
    if (!POLICY_DEFAULTS[fieldName]) {
      console.warn(`No default value for: ${fieldName}`);
    }
  });
};
```

## 📋 Best Practices

### Template Design

1. **Use Clear Placeholders**: `{{retention_period}}` not `{{rp}}`
2. **Provide Context**: Include comments for complex sections
3. **Be Specific**: Avoid vague requirements
4. **Include Examples**: Show what good compliance looks like
5. **Consider Variations**: Account for different org sizes/types

### Content Guidelines

1. **Legal Language**: Use clear, actionable language
2. **Measurable Requirements**: Define specific, testable criteria
3. **Implementation Guidance**: Provide practical steps
4. **Regular Updates**: Keep current with regulations
5. **User-Friendly**: Avoid unnecessary complexity

### Technical Implementation

1. **Consistent Naming**: Follow established token patterns
2. **Default Values**: Provide sensible defaults for all tokens
3. **Validation**: Check template integrity on load
4. **Error Handling**: Graceful failure for missing content
5. **Performance**: Optimize for fast generation

## 🚀 Deployment

### Auto-Discovery

The system automatically discovers new templates when they're added to the `src/templates/` directory and registered in `POLICY_TEMPLATES`.

### Version Control

```bash
# Add new template
git add src/templates/new_policy.md
git add src/lib/policyGenerator.ts
git add src/config/defaults.ts
git commit -m "feat: add new policy template for [purpose]"
```

### Testing Checklist

- [ ] Template renders without errors
- [ ] All placeholders have defaults
- [ ] Policy flows logically
- [ ] Compliance requirements are accurate
- [ ] UI correctly lists the new template
- [ ] Generated policy is properly formatted

## 📞 Getting Help

For template development questions:

- **Documentation**: This guide and inline code comments
- **Examples**: Study existing templates in `src/templates/`
- **Team**: Reach out to the development team
- **Compliance**: Consult legal/compliance team for content accuracy

**Happy template building! 🎉**
