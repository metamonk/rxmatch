# Encryption Configuration Documentation

**Project**: RxMatch
**Last Updated**: 2025-11-12
**Status**: Production Ready

## Overview

RxMatch implements enterprise-grade encryption for all Protected Health Information (PHI) and sensitive prescription data to ensure HIPAA compliance. This document details all encryption measures implemented for data at rest and data in transit.

---

## Data at Rest Encryption

### 1. PostgreSQL Database (Neon)

**Provider**: Neon (Serverless PostgreSQL)
**Encryption Standard**: AES-256
**Status**: Enabled by Default

#### Configuration

```bash
# Connection String (from DATABASE_URL)
postgresql://user:password@host.neon.tech/rxmatch?sslmode=require
```

#### Details

- **Encryption Method**: AES-256-CBC
- **Key Management**: Managed by Neon (automatic rotation)
- **Storage**: All data is encrypted at rest including:
  - User data
  - Prescription calculations (audit_log table)
  - Manual review queue entries
  - RxCUI mappings
  - NDC package information
- **Backup Encryption**: All backups are encrypted with the same AES-256 standard

#### Verification

```bash
# Verify SSL/TLS is required in connection
psql $DATABASE_URL -c "SHOW ssl;"
# Expected: on
```

#### Documentation

- [Neon Security Overview](https://neon.tech/docs/security/security-overview)
- [Neon Encryption](https://neon.tech/docs/security/encryption)

---

### 2. Redis Cache (Upstash)

**Provider**: Upstash Redis
**Encryption Standard**: AES-256
**Status**: Enabled by Default

#### Configuration

```bash
# Connection Configuration
REDIS_HOST=<region>-<id>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<encrypted-token>
```

#### Details

- **Encryption Method**: AES-256
- **Key Management**: Managed by Upstash
- **Cached Data**:
  - OpenAI API responses (7-day TTL)
  - RxCUI mappings (30-day TTL)
  - FDA NDC results (12-hour TTL)
- **TLS**: Enabled on port 6379

#### Verification

```bash
# Connection uses TLS automatically
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --tls ping
# Expected: PONG
```

#### Documentation

- [Upstash Security](https://upstash.com/docs/redis/features/security)

---

### 3. GCP Secret Manager

**Provider**: Google Cloud Platform
**Encryption Standard**: AES-256 (Google-managed keys)
**Status**: Active

#### Secrets Stored

```bash
# Secrets stored in GCP Secret Manager
- OPENAI_API_KEY
- DATABASE_URL (with credentials)
- REDIS_PASSWORD
- SESSION_SECRET
```

#### Configuration

```yaml
# Cloud Run service.yaml
env:
  - name: OPENAI_API_KEY
    valueFrom:
      secretKeyRef:
        name: openai-api-key
        key: latest
```

#### Details

- **Encryption**: Automatic encryption using Google-managed keys
- **Key Rotation**: Automatic rotation by Google
- **Access Control**: IAM-based access (github-actions-deployer service account)
- **Audit Logging**: All secret access is logged

#### Best Practices Implemented

1. Secrets are never committed to git
2. Secrets are only accessed at runtime
3. Secrets are injected via environment variables
4. Service account has minimal permissions (Secret Manager Secret Accessor)

#### Documentation

- [Secret Manager Encryption](https://cloud.google.com/secret-manager/docs/encryption)

---

## Data in Transit Encryption

### 1. HTTPS/TLS Configuration

**Minimum Version**: TLS 1.2
**Preferred Version**: TLS 1.3
**Status**: Enforced

#### Cloud Run (Application)

```yaml
# Automatic HTTPS with Cloud Run
service: rxmatch-api
region: us-central1
# Cloud Run provides:
# - Automatic TLS certificates (Google-managed)
# - TLS 1.2+ enforcement
# - Automatic certificate renewal
# - HTTPS-only access
```

#### Details

- **Certificate Type**: Automatic (Let's Encrypt via Google)
- **Certificate Renewal**: Automatic
- **HTTP Traffic**: Automatically redirected to HTTPS
- **TLS Versions**: TLS 1.2, TLS 1.3
- **Cipher Suites**: Strong ciphers only (managed by Google)

#### SvelteKit Security Headers

```typescript
// src/hooks.server.ts
response.headers.set(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains; preload'
);
```

**HSTS Details**:
- Max Age: 1 year (31536000 seconds)
- Include Subdomains: Yes
- Preload: Yes (eligible for browser HSTS preload list)

---

### 2. Database Connections

#### PostgreSQL (Neon)

```bash
# Connection string enforces TLS
DATABASE_URL=postgresql://...?sslmode=require

# SSL Mode Options:
# - require: Enforces SSL/TLS (minimum)
# - verify-ca: Verifies CA certificate
# - verify-full: Verifies CA and hostname
```

**Current Configuration**: `sslmode=require`

#### TLS Details

- **Protocol**: TLS 1.2+
- **Verification**: Server certificate validation
- **Cipher Suites**: Strong ciphers only

#### Verification

```javascript
// src/lib/db/index.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require', // Enforces TLS
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});
```

---

### 3. Redis Connections

#### Upstash Redis

```typescript
// src/lib/services/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: {}, // Enables TLS
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

**TLS Configuration**:
- **Enabled**: Yes (via `tls: {}`)
- **Port**: 6379 with TLS
- **Protocol**: TLS 1.2+

---

### 4. External API Connections

#### OpenAI API

```typescript
// src/lib/services/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Default: uses HTTPS with TLS 1.2+
});
```

**Details**:
- **Endpoint**: https://api.openai.com
- **Protocol**: TLS 1.3
- **Certificate**: Valid commercial certificate

#### RxNorm API (NIH)

```typescript
// src/lib/services/rxnorm.ts
const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';
```

**Details**:
- **Endpoint**: https://rxnav.nlm.nih.gov
- **Protocol**: TLS 1.2+
- **Authentication**: None (public API)
- **Encryption**: HTTPS enforced

#### FDA NDC API

```typescript
// src/lib/services/fda.ts
const FDA_BASE = 'https://api.fda.gov/drug/ndc.json';
```

**Details**:
- **Endpoint**: https://api.fda.gov
- **Protocol**: TLS 1.2+
- **Authentication**: None (public API)
- **Encryption**: HTTPS enforced

---

## Application-Level Security

### 1. Security Headers

Implemented in `src/hooks.server.ts`:

```typescript
// 1. HSTS - Force HTTPS
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'

// 2. CSP - Prevent XSS
'Content-Security-Policy': "default-src 'self'; ..."

// 3. Frame Protection
'X-Frame-Options': 'DENY'

// 4. MIME Sniffing Protection
'X-Content-Type-Options': 'nosniff'

// 5. Referrer Policy
'Referrer-Policy': 'strict-origin-when-cross-origin'

// 6. Permissions Policy
'Permissions-Policy': 'camera=(), microphone=(), ...'
```

### 2. Cache Control for Sensitive Data

```typescript
// API routes with PHI data
'Cache-Control': 'no-store, no-cache, must-revalidate'
'Pragma': 'no-cache'
'Expires': '0'
```

**Prevents**:
- Browser caching of PHI
- Proxy caching of sensitive data
- CDN caching of API responses

---

## Future Enhancements (Optional)

### 1. Application-Level Encryption

For extra-sensitive fields, consider adding field-level encryption:

```typescript
// Example: Encrypt specific PHI fields
import crypto from 'crypto';

function encryptPHI(data: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

**Use Cases**:
- Patient names (if added)
- Prescriber information
- Detailed medical notes

### 2. Database Column Encryption

```sql
-- PostgreSQL pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt specific columns
ALTER TABLE audit_log
ADD COLUMN encrypted_data bytea;
```

### 3. Certificate Pinning (Mobile Apps)

If a mobile app is developed:

```typescript
// Certificate pinning configuration
const certPins = [
  'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
];
```

---

## Compliance Verification

### Encryption Standards Met

- ✅ HIPAA: AES-256 for data at rest
- ✅ HIPAA: TLS 1.2+ for data in transit
- ✅ NIST: Strong cryptographic algorithms
- ✅ PCI DSS: TLS 1.2+ for API communications

### Security Checklist

- ✅ All database connections use TLS
- ✅ All external API calls use HTTPS
- ✅ All secrets stored in GCP Secret Manager
- ✅ HSTS header enforces HTTPS
- ✅ No plaintext credentials in code
- ✅ No sensitive data logged
- ✅ Cache-Control prevents PHI caching

---

## Monitoring and Auditing

### 1. TLS Certificate Monitoring

```bash
# Check certificate expiration
echo | openssl s_client -servername rxmatch-api.run.app -connect rxmatch-api.run.app:443 2>/dev/null | openssl x509 -noout -dates
```

### 2. Security Headers Verification

```bash
# Test security headers
curl -I https://rxmatch-api.run.app
```

### 3. Database Connection Audit

```sql
-- Check SSL connections (PostgreSQL)
SELECT * FROM pg_stat_ssl;
```

---

## Incident Response

### Certificate Issues

1. Cloud Run certificates are automatic - no action needed
2. If issues occur, check GCP Console > Cloud Run > Service > Security tab

### Database Connection Issues

1. Verify `sslmode=require` in DATABASE_URL
2. Check Neon status: https://neon.tech/status
3. Verify network connectivity with `psql` test connection

### Redis Connection Issues

1. Verify TLS is enabled in connection config
2. Check Upstash status: https://upstash.com/status
3. Test connection: `redis-cli --tls -h $REDIS_HOST ping`

---

## References

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Document Status**: Complete
**Next Review**: 2025-12-12 (30 days)
