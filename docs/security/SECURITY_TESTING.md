# Security Testing Guide

**Project**: RxMatch
**Last Updated**: 2025-11-12
**Purpose**: Comprehensive security testing procedures for HIPAA compliance

---

## Overview

This document provides step-by-step procedures for testing security configurations in RxMatch. These tests should be performed:

- Before production deployment
- After major updates
- Quarterly for compliance
- After security incidents

---

## Test Environment Setup

### Prerequisites

```bash
# Install testing tools
npm install -g @lhci/cli
npm install -g observatory-cli
brew install nmap
brew install ssllabs-scan

# Or use Docker
docker pull owasp/zap2docker-stable
```

### Test Credentials (Development Only)

```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/rxmatch_test
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=sk-test-key
```

---

## 1. HTTPS/TLS Testing

### Test 1.1: Verify TLS Configuration

**Objective**: Ensure TLS 1.2+ is enforced and strong ciphers are used

```bash
# Test SSL/TLS configuration
nmap --script ssl-enum-ciphers -p 443 rxmatch-api.run.app

# Expected output:
# - TLS 1.2 and 1.3 only
# - No weak ciphers (RC4, DES, 3DES)
# - Forward secrecy enabled
```

**Manual Test**:
```bash
# Test TLS 1.0 (should fail)
openssl s_client -connect rxmatch-api.run.app:443 -tls1

# Test TLS 1.2 (should succeed)
openssl s_client -connect rxmatch-api.run.app:443 -tls1_2

# Test TLS 1.3 (should succeed)
openssl s_client -connect rxmatch-api.run.app:443 -tls1_3
```

**Pass Criteria**:
- ✅ TLS 1.0/1.1 rejected
- ✅ TLS 1.2 accepted
- ✅ TLS 1.3 accepted
- ✅ No weak ciphers

### Test 1.2: SSL Labs Test

**Objective**: Verify SSL configuration meets industry standards

```bash
# Online test (recommended)
open https://www.ssllabs.com/ssltest/analyze.html?d=rxmatch-api.run.app

# CLI test
ssllabs-scan rxmatch-api.run.app
```

**Pass Criteria**:
- ✅ Grade A or A+
- ✅ Certificate valid
- ✅ No vulnerabilities
- ✅ HSTS enabled

### Test 1.3: Certificate Validation

**Objective**: Ensure certificate is valid and properly configured

```bash
# Check certificate details
echo | openssl s_client -servername rxmatch-api.run.app \
  -connect rxmatch-api.run.app:443 2>/dev/null | openssl x509 -noout -text

# Check expiration
echo | openssl s_client -servername rxmatch-api.run.app \
  -connect rxmatch-api.run.app:443 2>/dev/null | openssl x509 -noout -dates
```

**Pass Criteria**:
- ✅ Certificate not expired
- ✅ Valid CA signature
- ✅ Correct domain name
- ✅ Expires > 30 days from now

---

## 2. Security Headers Testing

### Test 2.1: Verify Security Headers

**Objective**: Ensure all security headers are present and correct

```bash
# Test security headers
curl -I https://rxmatch-api.run.app

# Or use a testing tool
curl -s -D - https://rxmatch-api.run.app -o /dev/null | grep -i "security\|x-frame\|x-content\|strict-transport\|content-security"
```

**Expected Headers**:
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), ...
X-XSS-Protection: 1; mode=block
```

**Pass Criteria**:
- ✅ All headers present
- ✅ HSTS max-age ≥ 31536000
- ✅ CSP restricts resources
- ✅ X-Frame-Options set to DENY

### Test 2.2: CSP Validation

**Objective**: Verify Content Security Policy prevents XSS

```bash
# Test CSP header parsing
curl -s -I https://rxmatch-api.run.app | grep "Content-Security-Policy"

# Online CSP validator
open https://csp-evaluator.withgoogle.com/
```

**Manual Test**:
1. Open browser developer console
2. Navigate to application
3. Try to execute inline script:
   ```javascript
   javascript:alert('XSS')
   ```
4. Should be blocked by CSP

**Pass Criteria**:
- ✅ CSP header present
- ✅ Inline scripts blocked (or nonce-based)
- ✅ External resources restricted
- ✅ No CSP errors in console (on normal pages)

### Test 2.3: Header Security Scanner

**Objective**: Comprehensive security header analysis

```bash
# Mozilla Observatory scan
npx observatory-cli rxmatch-api.run.app

# Or online
open https://observatory.mozilla.org/analyze/rxmatch-api.run.app
```

**Pass Criteria**:
- ✅ Score ≥ A
- ✅ All tests pass
- ✅ No warnings

---

## 3. Database Encryption Testing

### Test 3.1: PostgreSQL SSL Connection

**Objective**: Verify database connections use SSL/TLS

```bash
# Test PostgreSQL connection with SSL
psql "$DATABASE_URL" -c "SHOW ssl;"
# Expected: on

# Verify SSL mode
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
# Expected: ssl = t (true)
```

**Pass Criteria**:
- ✅ SSL enabled
- ✅ TLS version ≥ 1.2
- ✅ Connection fails without SSL

### Test 3.2: Redis TLS Connection

**Objective**: Verify Redis uses TLS

```bash
# Test Redis connection with TLS
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --tls ping
# Expected: PONG

# Test without TLS (should fail)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Expected: Connection error or timeout
```

**Pass Criteria**:
- ✅ TLS connection succeeds
- ✅ Non-TLS connection fails
- ✅ Correct password required

### Test 3.3: Data at Rest Encryption

**Objective**: Verify data is encrypted in storage

```bash
# Neon encryption verification
# 1. Check Neon dashboard for encryption status
# 2. Verify AES-256 is enabled in project settings

# For PostgreSQL, check tablespace encryption
psql "$DATABASE_URL" -c "
  SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
  FROM pg_database
  WHERE datname = current_database();
"
```

**Pass Criteria**:
- ✅ Database reports encryption enabled
- ✅ Backups are encrypted
- ✅ Provider confirms AES-256

---

## 4. Authentication & Authorization Testing

**Note**: Authentication is currently deferred. These tests will be applicable when implemented.

### Test 4.1: Password Policy

**Objective**: Ensure strong password requirements

```typescript
// Test password validation
const weakPasswords = [
  'password',
  '12345678',
  'abcdefgh',
  'Password',
  'Pass123'
];

const strongPasswords = [
  'MyP@ssw0rd!2024',
  'C0mplex#P@ssw0rd',
  'S3cur3!P@ssphrase'
];

// All weak passwords should be rejected
// All strong passwords should be accepted
```

**Pass Criteria**:
- ✅ Minimum 12 characters
- ✅ Mixed case required
- ✅ Numbers required
- ✅ Special characters required
- ✅ Common passwords blocked

### Test 4.2: Session Management

**Objective**: Verify secure session handling

```bash
# Test session cookie attributes
curl -I https://rxmatch-api.run.app

# Check for:
# - HttpOnly flag
# - Secure flag
# - SameSite=Strict or Lax
```

**Pass Criteria**:
- ✅ HttpOnly flag set
- ✅ Secure flag set
- ✅ SameSite attribute present
- ✅ Session expires after inactivity

### Test 4.3: Access Control

**Objective**: Verify role-based permissions

```typescript
// Test RBAC enforcement
describe('Access Control', () => {
  it('Admin can access all features', async () => {
    const admin = { role: 'admin' };
    expect(canParsePrescription(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
    expect(canExportData(admin)).toBe(true);
  });

  it('Pharmacist has limited access', async () => {
    const pharmacist = { role: 'pharmacist' };
    expect(canParsePrescription(pharmacist)).toBe(true);
    expect(canManageUsers(pharmacist)).toBe(false);
    expect(canExportData(pharmacist)).toBe(false);
  });

  it('Viewer is read-only', async () => {
    const viewer = { role: 'viewer' };
    expect(canParsePrescription(viewer)).toBe(false);
    expect(canManageUsers(viewer)).toBe(false);
    expect(canViewResults(viewer)).toBe(true);
  });
});
```

**Pass Criteria**:
- ✅ Roles enforced server-side
- ✅ Unauthorized actions blocked
- ✅ Client-side checks match server

---

## 5. Input Validation Testing

### Test 5.1: Injection Prevention

**Objective**: Prevent SQL injection, XSS, and other injection attacks

```typescript
// SQL Injection test cases
const sqlInjectionTests = [
  "'; DROP TABLE audit_log; --",
  "1' OR '1'='1",
  "admin'--",
  "1; DELETE FROM users WHERE 1=1"
];

// XSS test cases
const xssTests = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
  "<svg onload=alert('XSS')>"
];

// Command Injection test cases
const cmdInjectionTests = [
  "; cat /etc/passwd",
  "| ls -la",
  "&& rm -rf /",
  "`whoami`"
];
```

**Test Procedure**:
```bash
# Test SQL injection on prescription input
curl -X POST https://rxmatch-api.run.app/api/parse \
  -H "Content-Type: application/json" \
  -d '{"prescription": "Lipitor 20mg'; DROP TABLE audit_log; --"}'

# Expected: Input validation error or sanitized input
```

**Pass Criteria**:
- ✅ SQL injection prevented
- ✅ XSS payloads escaped
- ✅ Command injection blocked
- ✅ No error messages reveal DB structure

### Test 5.2: Input Sanitization

**Objective**: Verify Zod schemas reject invalid input

```typescript
import { PrescriptionSchema } from '$lib/types/prescription';

describe('Input Validation', () => {
  it('Rejects empty drug name', () => {
    expect(() => PrescriptionSchema.parse({
      drugName: '',
      quantity: 30
    })).toThrow();
  });

  it('Rejects negative quantity', () => {
    expect(() => PrescriptionSchema.parse({
      drugName: 'Lipitor',
      quantity: -10
    })).toThrow();
  });

  it('Rejects excessively long input', () => {
    expect(() => PrescriptionSchema.parse({
      drugName: 'A'.repeat(1000),
      quantity: 30
    })).toThrow();
  });
});
```

**Pass Criteria**:
- ✅ Invalid input rejected
- ✅ Appropriate error messages
- ✅ No server errors on bad input

---

## 6. Audit Logging Testing

### Test 6.1: Audit Log Completeness

**Objective**: Verify all PHI access is logged

```typescript
// Test audit log creation
describe('Audit Logging', () => {
  it('Logs prescription parsing', async () => {
    await parsePrescription('Lipitor 20mg daily');

    const logs = await getAuditLogs({ action: 'prescription_parse' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toHaveProperty('userId');
    expect(logs[0]).toHaveProperty('timestamp');
    expect(logs[0]).toHaveProperty('inputData');
  });

  it('Logs manual review actions', async () => {
    await manualReview(calculationId, { approved: true });

    const logs = await getAuditLogs({ action: 'manual_review' });
    expect(logs.length).toBeGreaterThan(0);
  });
});
```

**Pass Criteria**:
- ✅ All PHI access logged
- ✅ Logs include timestamp
- ✅ Logs include user ID
- ✅ Logs include action type
- ✅ Logs are immutable

### Test 6.2: Log Retention

**Objective**: Verify logs are retained for 7 years

```sql
-- Check oldest audit log
SELECT MIN(timestamp) FROM audit_log;
-- Should be retained for 7 years

-- Check log count
SELECT COUNT(*) FROM audit_log;
-- Should not be artificially limited
```

**Pass Criteria**:
- ✅ Logs not automatically deleted
- ✅ No retention policy < 7 years
- ✅ Logs accessible for compliance

---

## 7. Vulnerability Scanning

### Test 7.1: OWASP ZAP Scan

**Objective**: Identify common web vulnerabilities

```bash
# Start ZAP in daemon mode
docker run -d --name zap -p 8080:8080 owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8080

# Run baseline scan
docker exec zap zap-baseline.py -t https://rxmatch-api.run.app -r zap-report.html

# View report
open zap-report.html
```

**Pass Criteria**:
- ✅ No high-risk vulnerabilities
- ✅ Medium-risk issues documented
- ✅ Remediation plan for findings

### Test 7.2: Dependency Scanning

**Objective**: Check for vulnerable dependencies

```bash
# NPM audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for critical vulnerabilities
npm audit --audit-level=critical
```

**Pass Criteria**:
- ✅ No critical vulnerabilities
- ✅ High vulnerabilities patched
- ✅ Outdated dependencies updated

### Test 7.3: Container Scanning (Docker)

**Objective**: Scan Docker image for vulnerabilities

```bash
# Build image
docker build -t rxmatch:test .

# Scan with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image rxmatch:test

# Or use GCP Container Scanning
gcloud artifacts docker images scan rxmatch:latest
```

**Pass Criteria**:
- ✅ No critical CVEs
- ✅ Base image up to date
- ✅ Known vulnerabilities patched

---

## 8. Rate Limiting & DoS Protection

### Test 8.1: Rate Limiting

**Objective**: Verify rate limits prevent abuse

```bash
# Test rate limiting with rapid requests
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://rxmatch-api.run.app/api/parse &
done
wait

# Expected: Some requests return 429 (Too Many Requests)
```

**Pass Criteria**:
- ✅ Rate limiting active
- ✅ 429 status after threshold
- ✅ Retry-After header present
- ✅ Legitimate traffic not blocked

### Test 8.2: Request Size Limits

**Objective**: Prevent large payload attacks

```bash
# Test with large payload (> 10MB)
dd if=/dev/zero bs=1M count=20 | curl -X POST \
  -H "Content-Type: application/json" \
  -d @- https://rxmatch-api.run.app/api/parse

# Expected: 413 Payload Too Large
```

**Pass Criteria**:
- ✅ Large payloads rejected
- ✅ 413 status returned
- ✅ Server remains responsive

---

## 9. Error Handling Testing

### Test 9.1: Error Message Security

**Objective**: Ensure errors don't leak sensitive information

```typescript
// Test error responses
describe('Error Handling', () => {
  it('Does not expose stack traces in production', async () => {
    const response = await fetch('/api/parse', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });

    const error = await response.json();
    expect(error).not.toContain('at Object');
    expect(error).not.toContain('node_modules');
    expect(error).not.toContain('src/lib');
  });

  it('Does not expose database details', async () => {
    // Trigger database error
    const response = await fetch('/api/parse', {
      method: 'POST',
      body: JSON.stringify({ /* bad data */ })
    });

    const error = await response.json();
    expect(error).not.toContain('postgres');
    expect(error).not.toContain('neon.tech');
    expect(error).not.toContain('DATABASE_URL');
  });
});
```

**Pass Criteria**:
- ✅ No stack traces in production
- ✅ Generic error messages
- ✅ No sensitive paths revealed
- ✅ Errors logged securely

---

## 10. Backup & Recovery Testing

### Test 10.1: Database Backup

**Objective**: Verify backups are created and encrypted

```bash
# Check Neon backup status
# (via Neon console or API)

# Verify backup encryption
# - Check Neon dashboard
# - Confirm AES-256 encryption
```

**Pass Criteria**:
- ✅ Daily backups enabled
- ✅ Backups encrypted
- ✅ Point-in-time recovery available

### Test 10.2: Backup Restoration

**Objective**: Test disaster recovery procedures

```bash
# 1. Create test backup
pg_dump $DATABASE_URL > backup_test.sql

# 2. Drop test database (DO NOT DO IN PRODUCTION)
# psql $DATABASE_URL -c "DROP DATABASE rxmatch_test;"

# 3. Restore from backup
# psql $DATABASE_URL < backup_test.sql

# 4. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_log;"
```

**Pass Criteria**:
- ✅ Backup completes successfully
- ✅ Restoration completes < 1 hour
- ✅ All data restored correctly
- ✅ Application functional after restore

---

## Security Testing Checklist

### Before Production Deployment

- [ ] TLS 1.2+ enforced (Test 1.1)
- [ ] SSL Labs grade A/A+ (Test 1.2)
- [ ] All security headers present (Test 2.1)
- [ ] CSP properly configured (Test 2.2)
- [ ] Database connections use TLS (Test 3.1)
- [ ] Redis uses TLS (Test 3.2)
- [ ] Input validation working (Test 5.1)
- [ ] Audit logging complete (Test 6.1)
- [ ] No critical vulnerabilities (Test 7.1-7.3)
- [ ] Rate limiting active (Test 8.1)
- [ ] Error handling secure (Test 9.1)
- [ ] Backups tested (Test 10.1-10.2)

### Quarterly Testing

- [ ] Re-run SSL Labs scan
- [ ] Update dependency audit
- [ ] Container vulnerability scan
- [ ] OWASP ZAP full scan
- [ ] Test backup restoration
- [ ] Review audit logs
- [ ] Update security documentation

### After Major Updates

- [ ] Security header verification
- [ ] Input validation tests
- [ ] Authentication tests (when implemented)
- [ ] Dependency audit
- [ ] Integration tests

---

## Automated Testing

### CI/CD Integration

```yaml
# .github/workflows/security.yml
name: Security Testing

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Dependency Audit
        run: npm audit --audit-level=high

      - name: Lint Security Issues
        run: npm run lint

      - name: Run Security Tests
        run: npm test -- --testPathPattern=security

      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://rxmatch-api.run.app'
```

---

## Reporting Security Issues

### Internal Reporting

1. Document finding in security log
2. Assign severity (Critical, High, Medium, Low)
3. Create remediation plan
4. Track resolution
5. Update documentation

### External Reporting

If external security researchers find vulnerabilities:

1. Acknowledge receipt within 24 hours
2. Investigate and verify issue
3. Develop patch within 7 days (critical) or 30 days (non-critical)
4. Deploy fix
5. Credit researcher (if desired)

---

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [NIST SP 800-115: Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)

---

**Document Control**:
- Version: 1.0
- Created: 2025-11-12
- Last Updated: 2025-11-12
- Next Review: 2025-12-12
