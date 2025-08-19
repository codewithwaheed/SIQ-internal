# {{policy_title}}

**Introduction**  
{{intro}}

**Purpose**  
This policy establishes requirements for creating, managing, and protecting passwords to safeguard {{business_name}} information systems and data.

**Scope**  
This policy applies to all employees, contractors, and third parties who have access to {{business_name}} information systems, applications, and network resources.

**Definitions**

- **Password**: A secret combination of characters used to authenticate user identity
- **Multi-Factor Authentication (MFA)**: Authentication method requiring two or more verification factors
- **Privileged Account**: Account with elevated system permissions

**Policy Statement**  
{{business_name}} establishes comprehensive password security requirements to protect organizational information systems from unauthorized access and cyber threats. All personnel must implement strong password practices that align with current industry standards and regulatory compliance requirements.

**3.1 Password Complexity and Construction Standards**

All user passwords **shall** meet rigorous complexity requirements designed to resist both automated attacks and social engineering attempts. Passwords must contain a minimum of **{{min_password_length}}** and include **{{complexity_requirements}}**. Additionally, passwords **shall not** contain dictionary words, personal information such as names or birthdates, sequential characters, or repeated patterns that could be easily guessed by attackers.

**3.2 Password Lifecycle Management**

**3.2.1 Regular Password Updates**: Users **must** change their passwords every **{{password_rotation_days}}** to maintain security effectiveness over time. The system provides advance notification before expiration, allowing users to update credentials without service interruption.

**3.2.2 Password History Controls**: To ensure password diversity and prevent security degradation, the system **shall** maintain a history of the last **{{password_history_count}}** passwords for each user account. This prevents immediate reuse of recently used passwords and encourages the creation of new, unique credentials.

**3.2.3 Password Management Tools**: Users **are strongly encouraged** to utilize approved enterprise password management solutions when available. These tools generate cryptographically strong passwords and provide secure storage, reducing the burden of remembering multiple complex credentials while maintaining security standards.

**3.3 Account Protection and Access Controls**

**3.3.1 Automated Account Lockout**: User accounts **will** be automatically locked after **{{lockout_threshold}}** consecutive failed login attempts to prevent brute force attacks and unauthorized access attempts. This security measure balances protection against automated attacks with reasonable user accessibility.

**3.3.2 Lockout Recovery Procedures**: Locked accounts **shall** remain inaccessible for **{{lockout_duration_minutes}}** before automatic unlock occurs. During this period, users may contact the IT help desk for immediate assistance if required for business operations.

**3.3.3 Multi-Factor Authentication Requirements**: Multi-factor authentication (MFA) **{{mfa_required}}** to provide additional security layers beyond password protection. This requirement particularly applies to accounts with administrative privileges, remote access capabilities, or access to sensitive organizational data.

**Procedures**

1. **Password Creation**
   - Use strong, unique passwords for each system
   - Avoid predictable patterns or sequences
   - Never share passwords with others

2. **Password Storage**
   - Store passwords in approved password management tools
   - Encrypt password files if manual storage required
   - Never write passwords on paper or unsecured locations

3. **Password Recovery**
   - Use official password reset procedures only
   - Verify identity through established channels
   - Report suspicious password reset requests immediately

**Responsibilities**

- **IT Security Team**: Implement technical controls, monitor compliance, provide training
- **Managers**: Ensure team compliance, support security awareness
- **All Users**: Follow password requirements, report security incidents, maintain account security

**Consequences of Non-Compliance**  
Violations may result in:

- Immediate account suspension
- Mandatory security training
- Progressive disciplinary action up to termination
- Legal action for willful security breaches

**References**

- NIST SP 800-63B Digital Identity Guidelines
- {{business_name}} Information Security Policy
- {{business_name}} Incident Response Plan

**Revision History**  
| Version | Date | Author | Change |  
|---------|------|--------|--------|  
| 1.0 | {{today}} | SentrIQ AI | Initial |
