# RxMatch Operations Runbook

**Task 17: Monitoring and Alert Configuration**
**Date:** 2025-11-12
**Project:** RxMatch
**Purpose:** Incident response procedures and troubleshooting guide

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Critical Alerts](#critical-alerts)
3. [Warning Alerts](#warning-alerts)
4. [Common Issues](#common-issues)
5. [Escalation Procedures](#escalation-procedures)
6. [Recovery Procedures](#recovery-procedures)
7. [Post-Incident Review](#post-incident-review)

---

## Emergency Contacts

### On-Call Rotation
- **Primary:** alerts@yourdomain.com
- **Secondary:** on-call@yourdomain.com
- **Escalation:** devops-lead@yourdomain.com

### External Service Contacts
- **GCP Support:** https://cloud.google.com/support
- **Neon (Database):** support@neon.tech
- **Upstash (Redis):** support@upstash.com
- **OpenAI Support:** https://help.openai.com

### Service Status Pages
- **GCP Status:** https://status.cloud.google.com/
- **OpenAI Status:** https://status.openai.com/
- **Neon Status:** https://neon.tech/status
- **Upstash Status:** https://upstash.com/status

---

## Critical Alerts

### Service Down

**Alert Name:** RxMatch - Service Down (CRITICAL)
**Severity:** P1 (Critical)
**Response Time:** Immediate (within 5 minutes)

#### Symptoms
- No requests being processed
- Service returning 503 errors
- Health checks failing
- Alert email received

#### Diagnostic Steps

1. **Check Cloud Run Service Status**
   ```bash
   gcloud run services describe rxmatch \
     --region=us-central1 \
     --format="value(status.conditions)"
   ```

2. **Check Recent Deployments**
   ```bash
   gcloud run revisions list \
     --service=rxmatch \
     --region=us-central1 \
     --limit=5
   ```

3. **Check Service Logs**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rxmatch" \
     --limit=50 \
     --format=json
   ```

4. **Check for Build Failures**
   - Go to Cloud Build history
   - Check latest build status
   - Review build logs for errors

#### Common Causes

| Cause | Symptoms | Resolution |
|-------|----------|------------|
| Failed deployment | Container won't start | Rollback to previous revision |
| Missing secrets | Service crashes on startup | Verify secrets are configured |
| Port misconfiguration | Container starts but unreachable | Check PORT environment variable |
| Memory/CPU limits | OOMKilled in logs | Increase container resources |
| Invalid environment vars | Application crashes | Check environment configuration |

#### Resolution Steps

**Quick Fix: Rollback to Last Known Good**
```bash
# Get previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=rxmatch \
  --region=us-central1 \
  --format="value(metadata.name)" \
  --limit=2 | tail -n1)

# Rollback
gcloud run services update-traffic rxmatch \
  --region=us-central1 \
  --to-revisions=$PREVIOUS_REVISION=100
```

**Check Secret Configuration**
```bash
# List secrets
gcloud secrets list

# Verify secret versions
gcloud secrets versions list OPENAI_API_KEY
gcloud secrets versions list DATABASE_URL
gcloud secrets versions list REDIS_PASSWORD
```

**Check Environment Variables**
```bash
gcloud run services describe rxmatch \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**Increase Resources (if OOMKilled)**
```bash
gcloud run services update rxmatch \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2
```

#### Escalation
- If not resolved in 15 minutes, escalate to secondary on-call
- If not resolved in 30 minutes, escalate to DevOps lead
- Consider engaging GCP support for infrastructure issues

---

### High Error Rate (>5%)

**Alert Name:** RxMatch - High Error Rate >5% (CRITICAL)
**Severity:** P1 (Critical)
**Response Time:** Within 10 minutes

#### Symptoms
- >5% of requests failing
- User reports of errors
- Alert email received

#### Diagnostic Steps

1. **Identify Error Types**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=rxmatch \
     AND severity>=ERROR" \
     --limit=100 \
     --format=json | jq '.[] | {timestamp, message: .jsonPayload.message}'
   ```

2. **Check Error Distribution**
   - Go to Cloud Run → rxmatch → Logs
   - Filter by severity: ERROR
   - Look for patterns in error messages

3. **Check HTTP Status Codes**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=rxmatch \
     AND httpRequest.status>=400" \
     --limit=100 \
     --format=json | jq '.[] | .httpRequest.status' | sort | uniq -c
   ```

#### Common Causes

| Error Type | Cause | Resolution |
|------------|-------|------------|
| 401/403 errors | API key invalid/expired | Rotate API keys |
| 404 errors | Client errors (not critical) | Check if legitimate traffic |
| 500 errors | Application crashes | Check application logs |
| 502/503 errors | Service overload | Scale up instances |
| 504 errors | Timeouts | Check external API latency |

#### Resolution Steps

**Check API Key Validity**
```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# If invalid, rotate secret
gcloud secrets versions add OPENAI_API_KEY --data-file=./new-api-key.txt

# Redeploy service to pick up new secret
gcloud run services update rxmatch --region=us-central1
```

**Check External API Status**
- OpenAI: https://status.openai.com/
- RxNorm: https://rxnav.nlm.nih.gov/ (try manual request)
- FDA: https://open.fda.gov/ (try manual request)

**Check Database Connectivity**
```bash
# Check Neon dashboard for connection metrics
# Or test connection locally
psql "$DATABASE_URL" -c "SELECT 1"
```

**Check Redis Connectivity**
```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD PING
```

**Scale Up if Overloaded**
```bash
gcloud run services update rxmatch \
  --region=us-central1 \
  --max-instances=20
```

#### Escalation
- If external API down: Wait for service restoration, communicate to users
- If database issue: Escalate to Neon support
- If Redis issue: Escalate to Upstash support (app should degrade gracefully)
- If application bug: Deploy hotfix or rollback

---

### High Latency (>10s)

**Alert Name:** RxMatch - High Latency >10s (CRITICAL)
**Severity:** P1 (Critical)
**Response Time:** Within 15 minutes

#### Symptoms
- P95 response time >10 seconds
- Users reporting slow performance
- Alert email received

#### Diagnostic Steps

1. **Check Current Latency**
   - Go to Cloud Run → rxmatch → Metrics
   - View request latency graph
   - Identify when slowdown started

2. **Check Cache Hit Rates**
   ```bash
   # View cache-related logs
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=rxmatch \
     AND jsonPayload.component=cache" \
     --limit=100
   ```

3. **Check External API Latency**
   ```bash
   # Check for slow API calls in logs
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=rxmatch \
     AND jsonPayload.latencyMs>5000" \
     --limit=50
   ```

4. **Check Database Performance**
   - Go to Neon dashboard
   - Check query performance metrics
   - Look for slow queries

#### Common Causes

| Cause | Symptoms | Resolution |
|-------|----------|------------|
| Cache failure | All requests slow | Check Redis connectivity |
| OpenAI API slow | Parsing takes >5s | Check OpenAI status |
| Database slow queries | Database operations slow | Optimize queries or add indexes |
| Cold starts | First request slow | Increase min-instances |
| Network issues | All external calls slow | Check GCP network status |

#### Resolution Steps

**Check Redis Status**
```bash
# Test Redis latency
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD \
  --latency-history

# Check Upstash dashboard for metrics
```

**Warm Up Cache**
```bash
# If cache was cleared, warm it up with common requests
for drug in "lisinopril" "metformin" "atorvastatin"; do
  curl -X POST "$SERVICE_URL/api/validate" \
    -H "Content-Type: application/json" \
    -d "{\"prescriptionText\":\"$drug 10mg tablet\"}"
done
```

**Increase Min Instances (Reduce Cold Starts)**
```bash
gcloud run services update rxmatch \
  --region=us-central1 \
  --min-instances=1
```

**Check Database Indexes**
```sql
-- Connect to database and check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Temporary Workaround**
If external API is slow but service must stay up:
- Increase timeout tolerances
- Return cached data even if stale
- Show user a warning about degraded performance

#### Escalation
- If OpenAI slow: Check status page, may need to wait
- If database slow: Escalate to DBA or Neon support
- If persistent: Consider scaling vertically (more CPU/memory)

---

## Warning Alerts

### Elevated Error Rate (>2%)

**Alert Name:** RxMatch - Elevated Error Rate >2% (WARNING)
**Severity:** P2 (Warning)
**Response Time:** Within 30 minutes

#### Actions
1. Monitor error logs for patterns
2. Check if error rate is increasing
3. Identify if specific endpoint or error type
4. If rate continues to climb, treat as critical
5. If stable, investigate during business hours

#### Investigation
```bash
# Get error breakdown
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=rxmatch \
  AND severity>=ERROR" \
  --limit=100 \
  --format=json | jq '.[] | .jsonPayload' | sort | uniq -c
```

---

### Slow Response Time (>5s)

**Alert Name:** RxMatch - Slow Response Time >5s (WARNING)
**Severity:** P2 (Warning)
**Response Time:** Within 30 minutes

#### Actions
1. Check cache hit rates
2. Review external API latency
3. Check if traffic spike is causing overload
4. Monitor if latency increases further
5. If approaching 10s, treat as critical

#### Investigation
```bash
# Check recent request latency distribution
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=rxmatch \
  AND httpRequest.latency>5s" \
  --limit=50 \
  --format=json
```

---

### High Memory Usage (>80%)

**Alert Name:** RxMatch - High Memory Usage >80% (WARNING)
**Severity:** P2 (Warning)
**Response Time:** Within 1 hour

#### Symptoms
- Memory utilization >80%
- Potential for OOMKilled
- Alert email received

#### Diagnostic Steps

1. **Check Current Memory Usage**
   ```bash
   gcloud monitoring time-series list \
     --filter='metric.type="run.googleapis.com/container/memory/utilizations" AND resource.labels.service_name="rxmatch"' \
     --format=json
   ```

2. **Check for Memory Leaks**
   - Review application code for unclosed connections
   - Check if memory grows over time
   - Look for large cache sizes

3. **Check L1 Cache Size**
   - Review L1 cache configuration (500 items default)
   - Calculate memory usage: ~750KB for full cache
   - Ensure TTL is expiring old entries

#### Common Causes

| Cause | Resolution |
|-------|------------|
| L1 cache too large | Reduce cache size |
| Memory leak | Deploy fix |
| High concurrent load | Increase memory limit |
| Large request payloads | Add request size limits |

#### Resolution Steps

**Immediate: Increase Memory Limit**
```bash
gcloud run services update rxmatch \
  --region=us-central1 \
  --memory=1Gi
```

**Short-term: Clear L1 Cache**
- Restart service (new instances get fresh cache)
- Or deploy with reduced L1 cache size

**Long-term: Fix Memory Leak**
1. Identify leak using heap snapshots
2. Fix code
3. Deploy patch
4. Monitor memory over 24 hours

#### Prevention
- Set appropriate L1 cache limits
- Implement cache cleanup intervals
- Add memory usage monitoring in application
- Regular memory profiling

---

## Common Issues

### Issue: Service Not Scaling

**Symptoms:** Traffic increases but instances don't scale up

**Diagnostic:**
```bash
gcloud run services describe rxmatch \
  --region=us-central1 \
  --format="value(spec.template.spec.containerConcurrency,spec.template.metadata.annotations)"
```

**Resolution:**
- Check max-instances setting
- Check CPU/memory limits
- Verify autoscaling configuration

---

### Issue: Secrets Not Updating

**Symptoms:** New secret version not being used

**Resolution:**
```bash
# Force new revision
gcloud run services update rxmatch \
  --region=us-central1 \
  --update-env-vars=FORCE_REDEPLOY=$(date +%s)
```

---

### Issue: Cold Start Latency

**Symptoms:** First request to new instance is very slow

**Resolution:**
```bash
# Set minimum instances
gcloud run services update rxmatch \
  --region=us-central1 \
  --min-instances=1

# Or use CPU boost
gcloud run services update rxmatch \
  --region=us-central1 \
  --cpu-boost
```

---

### Issue: Rate Limited by External API

**Symptoms:** 429 errors from OpenAI, RxNorm, or FDA

**OpenAI Resolution:**
- Check quota: https://platform.openai.com/account/usage
- Upgrade plan if needed
- Implement request queuing

**RxNorm/FDA Resolution:**
- These are public APIs, should not rate limit
- If rate limited, implement exponential backoff
- Consider caching more aggressively

---

## Escalation Procedures

### Escalation Matrix

| Time Since Alert | Action |
|------------------|--------|
| 0 min | Primary on-call notified |
| 15 min (Critical) | Secondary on-call notified |
| 30 min (Critical) | DevOps lead notified |
| 1 hour (Critical) | Engineering manager notified |
| 2 hours (Critical) | CTO/VP Engineering notified |

### When to Escalate

**Escalate immediately if:**
- Data loss or corruption suspected
- Security breach suspected
- Complete service outage
- Unable to diagnose issue

**Escalate after attempts if:**
- Standard runbook steps don't resolve issue
- Issue requires access you don't have
- Issue is with external provider
- Fix requires code deployment

### Escalation Contacts

1. **Primary On-Call:** alerts@yourdomain.com
2. **Secondary On-Call:** on-call@yourdomain.com
3. **DevOps Lead:** devops-lead@yourdomain.com
4. **Engineering Manager:** eng-manager@yourdomain.com
5. **GCP Support:** File ticket via console

---

## Recovery Procedures

### Rollback Deployment

```bash
# List recent revisions
gcloud run revisions list \
  --service=rxmatch \
  --region=us-central1 \
  --limit=5

# Rollback to specific revision
gcloud run services update-traffic rxmatch \
  --region=us-central1 \
  --to-revisions=rxmatch-00042-xyz=100
```

### Restart Service

```bash
# Force new revision (restarts all instances)
gcloud run services update rxmatch \
  --region=us-central1 \
  --update-env-vars=RESTART=$(date +%s)
```

### Clear Cache

**Redis (L2 Cache):**
```bash
# Clear all cache
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD FLUSHDB

# Clear specific pattern
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD --scan --pattern "openai:*" | xargs redis-cli DEL
```

**L1 Cache:**
- Automatically cleared on service restart
- No manual clearing needed

### Restore from Backup

**Database (Neon):**
1. Go to Neon dashboard
2. Select project
3. Go to Backups tab
4. Restore from point-in-time

**Redis:**
- Upstash provides automatic backups
- Contact support for restore

---

## Post-Incident Review

### Immediate Actions (Within 1 hour of resolution)

1. **Document the incident:**
   - What happened?
   - When did it start?
   - When was it detected?
   - How was it resolved?
   - What was the impact?

2. **Notify stakeholders:**
   - Send resolution email
   - Update status page
   - Thank responders

### Follow-up Actions (Within 48 hours)

1. **Root Cause Analysis:**
   - Why did the issue occur?
   - Why wasn't it prevented?
   - Why wasn't it detected sooner?

2. **Action Items:**
   - What can prevent recurrence?
   - What monitoring gaps exist?
   - What documentation needs updating?

3. **Post-Mortem Document:**
   - Timeline of events
   - Root cause
   - Resolution steps
   - Action items with owners
   - Lessons learned

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Date] - [Brief Description]

## Summary
- **Date/Time:** YYYY-MM-DD HH:MM UTC
- **Duration:** X hours Y minutes
- **Severity:** P1/P2/P3
- **Impact:** Number of affected users, downtime, etc.

## Timeline
- HH:MM - Alert triggered
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix implemented
- HH:MM - Service restored

## Root Cause
Detailed explanation of what caused the incident.

## Resolution
How the issue was resolved.

## Impact
- Users affected: X
- Downtime: Y minutes
- Data loss: None/Details
- Revenue impact: $X

## Action Items
1. [Action item 1] - Owner: [Name] - Due: [Date]
2. [Action item 2] - Owner: [Name] - Due: [Date]

## Lessons Learned
What we learned and how we'll improve.
```

---

## Quick Reference

### Essential Commands

```bash
# Check service status
gcloud run services describe rxmatch --region=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# List revisions
gcloud run revisions list --service=rxmatch --region=us-central1

# Rollback
gcloud run services update-traffic rxmatch --to-revisions=REVISION=100

# Scale
gcloud run services update rxmatch --max-instances=20

# Update memory
gcloud run services update rxmatch --memory=1Gi
```

### Important Links

- **GCP Console:** https://console.cloud.google.com
- **Cloud Run Service:** https://console.cloud.google.com/run/detail/us-central1/rxmatch
- **Logs Explorer:** https://console.cloud.google.com/logs/query
- **Monitoring:** https://console.cloud.google.com/monitoring
- **OpenAI Status:** https://status.openai.com/

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Next Review:** 2025-12-12
