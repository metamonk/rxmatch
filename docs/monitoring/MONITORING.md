# RxMatch Monitoring and Alerting Guide

**Task 17: Monitoring and Alert Configuration**
**Date:** 2025-11-12
**Project:** RxMatch
**Environment:** GCP Cloud Run

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Dashboards](#dashboards)
4. [Alert Policies](#alert-policies)
5. [Notification Channels](#notification-channels)
6. [Custom Metrics](#custom-metrics)
7. [Setup Instructions](#setup-instructions)
8. [Testing Alerts](#testing-alerts)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

RxMatch uses **GCP Cloud Monitoring** for comprehensive system observability. This document describes the monitoring and alerting infrastructure for production deployments.

### Goals

- **Real-time visibility** into system health and performance
- **Proactive alerting** for critical issues
- **Performance tracking** against SLA targets
- **Business metrics** monitoring

### Key Features

- 4 comprehensive dashboards
- 6 alert policies (3 critical, 3 warning)
- Email-based notifications
- Native Cloud Run integration
- Zero additional infrastructure

---

## Monitoring Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     RxMatch Application                      │
│                      (Cloud Run)                             │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Automatic Metrics
             │
┌────────────▼────────────────────────────────────────────────┐
│                  GCP Cloud Monitoring                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboards  │  │    Alerts    │  │  Log Metrics │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Notifications
             │
┌────────────▼────────────────────────────────────────────────┐
│                   Email Notifications                        │
│         (Primary & Secondary Alert Channels)                 │
└─────────────────────────────────────────────────────────────┘
```

### Metric Sources

1. **Cloud Run Built-in Metrics** (automatic)
   - Request count and rate
   - Response latency (p50, p95, p99)
   - Error rates (4xx, 5xx)
   - CPU and memory utilization
   - Container instance count

2. **Cloud Logging** (automatic)
   - Application logs
   - Error logs
   - Request logs

3. **Custom Metrics** (requires instrumentation)
   - API-specific performance (OpenAI, RxNorm, FDA)
   - Cache hit rates
   - Business metrics

---

## Dashboards

### 1. Application Health Dashboard

**Purpose:** Monitor overall service availability and performance

**Key Metrics:**

| Metric | Description | Target |
|--------|-------------|--------|
| Service Availability | Uptime percentage | 99.9% |
| Request Rate | Requests per minute | Monitored |
| Error Rate | 4xx and 5xx errors | <1% |
| Response Time | p50, p95, p99 latency | p95 <5s, p99 <10s |
| CPU Usage | Container CPU utilization | <70% |
| Memory Usage | Container memory utilization | <80% |
| Active Instances | Auto-scaling metrics | 0-10 |

**Use Cases:**
- Quick health check
- Performance trend analysis
- Capacity planning
- SLA monitoring

**Access:** GCP Console → Monitoring → Dashboards → "RxMatch - Application Health"

---

### 2. API Performance Dashboard

**Purpose:** Track external API dependencies and performance

**Key Metrics:**

| API | Metrics Tracked |
|-----|----------------|
| OpenAI | Request count, latency, error rate, cache hits |
| RxNorm | Request count, latency, error rate, cache hits |
| FDA | Request count, latency, error rate, cache hits |

**Custom Metrics Required:**
```typescript
// Log custom metrics in your application code
import { getPerformanceMonitor } from '$lib/utils/performance';

const monitor = getPerformanceMonitor();
monitor.startOperation('openai-parse', 'OpenAI API Call');
// ... make API call ...
monitor.endOperation('openai-parse', cacheHit, error);
```

**Note:** This dashboard displays log-based metrics. See [Custom Metrics](#custom-metrics) section for implementation.

**Use Cases:**
- API dependency monitoring
- Cache effectiveness analysis
- Cost tracking
- Rate limit monitoring

---

### 3. Database & Cache Dashboard

**Purpose:** Monitor data layer performance and reliability

**Key Metrics:**

| Component | Metrics |
|-----------|---------|
| PostgreSQL (Neon) | Connection errors, query performance |
| Redis (Upstash) | Connection errors, operation latency |
| L1 Cache | Hit rate, memory usage |
| L2 Cache | Hit rate, evictions |

**External Monitoring:**
- **Neon Dashboard:** Monitor connection pool, query performance
- **Upstash Dashboard:** Monitor Redis metrics, memory usage

**Custom Metrics Required:**
```typescript
// Log cache metrics
console.log(JSON.stringify({
  severity: 'INFO',
  component: 'cache',
  operation: 'get',
  cacheHit: true,
  latencyMs: 5
}));
```

**Use Cases:**
- Database connection pool monitoring
- Cache performance optimization
- Connection error detection
- Query performance analysis

---

### 4. Business Metrics Dashboard

**Purpose:** Track business-critical operations and outcomes

**Key Metrics:**

| Metric | Description | Target |
|--------|-------------|--------|
| Prescriptions Processed | Total count, success rate | Monitored |
| Confidence Score Distribution | High/Good/Medium/Low | >70% High/Good |
| Manual Review Queue | Pending items, avg review time | <50 pending |
| Export Actions | JSON/CSV downloads | Monitored |

**Custom Metrics Required:**
```typescript
// Log business events
console.log(JSON.stringify({
  severity: 'INFO',
  component: 'business',
  event: 'prescription_processed',
  confidenceLevel: 'high',
  requiresReview: false
}));
```

**Use Cases:**
- Product analytics
- Quality monitoring
- Workflow optimization
- User behavior tracking

---

## Alert Policies

### Critical Alerts (Immediate Action Required)

#### 1. Service Down

**Condition:** Service unavailable for >2 minutes
**Threshold:** Request count <0.01/min for 120s
**Notification:** Primary + Secondary email
**Auto-close:** 30 minutes

**Troubleshooting:**
1. Check Cloud Run service status
2. Review recent deployments
3. Check logs for startup errors
4. Verify environment variables and secrets

**Runbook:** See [RUNBOOK.md](./RUNBOOK.md#service-down)

---

#### 2. High Error Rate (>5%)

**Condition:** Error rate >5% for 5 minutes
**Threshold:** (4xx + 5xx) / total > 0.05 for 300s
**Notification:** Primary + Secondary email
**Auto-close:** 1 hour

**Common Causes:**
- API authentication failures
- Invalid request payloads
- External API errors
- Database connection issues

**Immediate Actions:**
1. Check error logs for patterns
2. Verify API keys are valid
3. Check external API status
4. Review recent code changes

**Runbook:** See [RUNBOOK.md](./RUNBOOK.md#high-error-rate)

---

#### 3. High Latency (>10s)

**Condition:** P95 latency >10s for 5 minutes
**Threshold:** PERCENTILE_95(latency) > 10000ms for 300s
**Notification:** Primary email
**Auto-close:** 30 minutes

**Common Causes:**
- OpenAI API slowdown
- Cache misses
- Database query performance
- Network issues

**Immediate Actions:**
1. Check cache hit rates
2. Review slow query logs
3. Check external API latency
4. Verify network connectivity

**Runbook:** See [RUNBOOK.md](./RUNBOOK.md#high-latency)

---

### Warning Alerts (Investigation Needed)

#### 4. Elevated Error Rate (>2%)

**Condition:** Error rate >2% for 10 minutes
**Threshold:** (4xx + 5xx) / total > 0.02 for 600s
**Notification:** Primary email
**Auto-close:** 1 hour

**Purpose:** Early warning before critical threshold
**Action:** Investigate but not urgent

---

#### 5. Slow Response Time (>5s)

**Condition:** P95 latency >5s for 10 minutes
**Threshold:** PERCENTILE_95(latency) > 5000ms for 600s
**Notification:** Primary email
**Auto-close:** 30 minutes

**Purpose:** Performance degradation warning
**Action:** Review cache and API performance

---

#### 6. High Memory Usage (>80%)

**Condition:** Memory utilization >80% for 15 minutes
**Threshold:** Memory usage > 0.80 for 900s
**Notification:** Primary email
**Auto-close:** 30 minutes

**Common Causes:**
- Memory leaks
- Large cache sizes
- High concurrent load

**Actions:**
1. Review memory usage trends
2. Check for memory leaks
3. Consider increasing container memory
4. Review L1 cache size

**Runbook:** See [RUNBOOK.md](./RUNBOOK.md#high-memory-usage)

---

## Notification Channels

### Primary Email Channel

**Purpose:** All alerts
**Configuration:**
- Display Name: "Primary Alert Email"
- Type: Email
- Address: Configured via `ALERT_EMAIL` environment variable

### Secondary Email Channel (Optional)

**Purpose:** Critical alerts only
**Configuration:**
- Display Name: "Secondary Alert Email"
- Type: Email
- Address: Configured via `ALERT_EMAIL_SECONDARY` environment variable

### Email Content

Alert emails include:
- Alert name and severity
- Condition that triggered
- Current metric value
- Threshold exceeded
- Link to dashboard
- Documentation/runbook link
- Timestamp

### Future Notification Options

For production scale, consider:
- **Slack:** Team notifications
- **PagerDuty:** On-call rotations
- **SMS:** Critical alerts only
- **Webhook:** Custom integrations

---

## Custom Metrics

### Overview

Cloud Run provides built-in metrics, but application-specific metrics require custom instrumentation using **Cloud Logging**.

### Implementation Approach

Use **log-based metrics** to create custom metrics from structured logs.

#### Step 1: Emit Structured Logs

```typescript
// src/lib/utils/logger.ts
export function logMetric(metricName: string, value: number, labels?: Record<string, string>) {
  console.log(JSON.stringify({
    severity: 'INFO',
    component: 'metrics',
    metric: metricName,
    value: value,
    labels: labels || {},
    timestamp: new Date().toISOString()
  }));
}
```

#### Step 2: Use in Application Code

```typescript
// Example: Log OpenAI API performance
import { logMetric } from '$lib/utils/logger';

const startTime = Date.now();
const result = await openai.parse(prescription);
const latency = Date.now() - startTime;

logMetric('openai_api_latency', latency, {
  cacheHit: 'false',
  success: 'true'
});

logMetric('openai_api_requests', 1, {
  cacheHit: 'false'
});
```

#### Step 3: Create Log-Based Metrics

**Via GCP Console:**

1. Go to **Logging → Logs-based Metrics**
2. Click **Create Metric**
3. Configure:
   - **Metric Type:** Counter or Distribution
   - **Filter:** `jsonPayload.metric="openai_api_latency"`
   - **Labels:** Extract from `jsonPayload.labels.*`
4. Save metric

**Via gcloud CLI:**

```bash
gcloud logging metrics create openai_api_latency \
  --description="OpenAI API request latency" \
  --value-extractor="EXTRACT(jsonPayload.value)" \
  --log-filter='jsonPayload.metric="openai_api_latency"'
```

#### Step 4: Use in Dashboards

Once created, custom metrics appear under:
- **Metric type:** `logging.googleapis.com/user/<metric-name>`
- **Resource type:** `cloud_run_revision`

### Recommended Custom Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `openai_api_requests` | Counter | OpenAI API calls |
| `openai_api_latency` | Distribution | OpenAI response time |
| `openai_api_errors` | Counter | OpenAI API errors |
| `rxnorm_api_requests` | Counter | RxNorm API calls |
| `rxnorm_api_latency` | Distribution | RxNorm response time |
| `fda_api_requests` | Counter | FDA API calls |
| `cache_hit_rate` | Distribution | L1+L2 cache hit % |
| `prescription_processed` | Counter | Prescriptions validated |
| `review_queue_size` | Gauge | Manual review queue |

### Performance Considerations

- **Cost:** Log-based metrics incur logging costs
- **Volume:** Be selective about what to log
- **Sampling:** Consider sampling for high-volume metrics
- **Retention:** Logs retained for 30 days by default

---

## Setup Instructions

### Prerequisites

- GCP account with Cloud Run deployed
- `gcloud` CLI installed and authenticated
- Project ID and service name
- Alert email addresses

### Option 1: Terraform (Recommended)

```bash
cd terraform/

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

**What gets created:**
- 2 notification channels (primary + secondary)
- 4 monitoring dashboards
- 6 alert policies

### Option 2: Shell Script

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_SERVICE_NAME="rxmatch"
export ALERT_EMAIL="alerts@yourdomain.com"
export ALERT_EMAIL_SECONDARY="on-call@yourdomain.com"

# Run setup script
./scripts/setup-monitoring.sh
```

**Note:** Dashboards cannot be created via gcloud CLI. Use Terraform or GCP Console.

### Option 3: Manual Setup (GCP Console)

1. **Create Notification Channels:**
   - Go to **Monitoring → Alerting → Notification Channels**
   - Add email addresses

2. **Create Alert Policies:**
   - Go to **Monitoring → Alerting → Create Policy**
   - Configure conditions and notifications
   - Use values from [Alert Policies](#alert-policies) section

3. **Create Dashboards:**
   - Go to **Monitoring → Dashboards → Create Dashboard**
   - Add widgets for metrics from [Dashboards](#dashboards) section

### Verification

After setup, verify:

```bash
# List notification channels
gcloud alpha monitoring channels list

# List alert policies
gcloud alpha monitoring policies list

# Check dashboards
gcloud monitoring dashboards list
```

---

## Testing Alerts

### Test Script

Use the provided test script to simulate failures:

```bash
# Set service URL
export SERVICE_URL="https://rxmatch-xxx.run.app"
export GCP_PROJECT_ID="your-project-id"

# Run test script (interactive)
./scripts/test-alerts.sh
```

### Manual Testing

#### Test 1: Service Down Alert

```bash
# Scale service to 0 instances
gcloud run services update rxmatch \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=0

# Wait 3 minutes
# Alert should trigger

# Restore service
gcloud run services update rxmatch \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=10
```

#### Test 2: High Error Rate Alert

```bash
# Generate 100 404 errors
for i in {1..100}; do
  curl -s -o /dev/null "$SERVICE_URL/nonexistent-endpoint"
done

# Wait 5-10 minutes
# Alert should trigger
```

#### Test 3: High Memory Usage Alert

```bash
# Generate high concurrent load
for i in {1..50}; do
  curl -s "$SERVICE_URL/api/validate" \
    -H "Content-Type: application/json" \
    -d '{"prescriptionText":"Test"}' &
done

# Wait 15-20 minutes
# Monitor memory in GCP Console
```

### Expected Results

| Alert | Expected Time to Trigger | Expected Notification |
|-------|-------------------------|----------------------|
| Service Down | 2-3 minutes | Primary + Secondary |
| High Error Rate | 5-7 minutes | Primary + Secondary |
| High Latency | 5-7 minutes | Primary |
| Elevated Error Rate | 10-12 minutes | Primary |
| Slow Response | 10-12 minutes | Primary |
| High Memory | 15-18 minutes | Primary |

---

## Maintenance

### Regular Tasks

#### Daily
- Review alert incidents (if any)
- Check dashboard for anomalies

#### Weekly
- Review error rate trends
- Analyze performance metrics
- Check cache hit rates

#### Monthly
- Review and tune alert thresholds
- Clean up test alerts
- Update documentation

### Alert Threshold Tuning

Based on production data, adjust thresholds:

```bash
# Update alert policy threshold
gcloud alpha monitoring policies update POLICY_ID \
  --update-condition-threshold-value=NEW_VALUE
```

### Adding New Alerts

1. Identify metric to monitor
2. Determine appropriate threshold
3. Create alert policy
4. Test alert trigger
5. Document in runbook

### Removing Outdated Alerts

```bash
# List all alert policies
gcloud alpha monitoring policies list

# Delete specific policy
gcloud alpha monitoring policies delete POLICY_ID
```

---

## Troubleshooting

### Issue: Alerts Not Triggering

**Possible Causes:**
- Alert policy disabled
- Notification channel not verified
- Condition threshold not met
- Metric not being reported

**Resolution:**
1. Check alert policy is enabled
2. Verify email address
3. Check metric is being reported
4. Review condition configuration

### Issue: Too Many False Positives

**Resolution:**
- Increase duration window
- Adjust threshold values
- Add filters to exclude noise
- Consider auto-close duration

### Issue: Missing Metrics in Dashboard

**Possible Causes:**
- Service not deployed
- Metric not being emitted
- Incorrect filter

**Resolution:**
1. Verify service is running
2. Check metric type and filter
3. Verify custom metrics are being logged

### Issue: Email Notifications Not Received

**Resolution:**
1. Check spam folder
2. Verify notification channel
3. Test with different email
4. Check GCP email quota

---

## Additional Resources

- [GCP Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Cloud Run Metrics](https://cloud.google.com/run/docs/monitoring)
- [Log-Based Metrics](https://cloud.google.com/logging/docs/logs-based-metrics)
- [Alert Policies Best Practices](https://cloud.google.com/monitoring/alerts/alerting-best-practices)
- [RxMatch Runbook](./RUNBOOK.md)
- [Performance Optimization Guide](../PERFORMANCE_OPTIMIZATION.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Maintained By:** DevOps Team
