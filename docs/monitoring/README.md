# RxMatch Monitoring Documentation

This directory contains comprehensive monitoring and operations documentation for the RxMatch prescription matching system.

## Contents

- **[MONITORING.md](./MONITORING.md)** - Complete monitoring setup guide
  - Dashboard configurations
  - Alert policies
  - Custom metrics implementation
  - Setup instructions
  - Testing procedures

- **[RUNBOOK.md](./RUNBOOK.md)** - Operations runbook
  - Incident response procedures
  - Troubleshooting guides
  - Escalation procedures
  - Recovery procedures
  - Post-incident review templates

## Quick Start

### For New Deployments

1. **Deploy Monitoring Infrastructure:**
   ```bash
   cd terraform/
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   terraform init
   terraform apply
   ```

2. **Test Alerts:**
   ```bash
   export SERVICE_URL="https://your-service.run.app"
   export GCP_PROJECT_ID="your-project-id"
   ./scripts/test-alerts.sh
   ```

3. **Review Documentation:**
   - Read [MONITORING.md](./MONITORING.md) for detailed setup
   - Review [RUNBOOK.md](./RUNBOOK.md) for incident response

### For Existing Deployments

1. **View Dashboards:**
   - Go to GCP Console → Monitoring → Dashboards
   - Look for "RxMatch" dashboards

2. **Check Alerts:**
   - Go to GCP Console → Monitoring → Alerting
   - Review active alerts and policies

3. **Review Logs:**
   - Go to GCP Console → Logging → Logs Explorer
   - Filter by `resource.type="cloud_run_revision"`

## Key Monitoring Metrics

### Service Level Objectives (SLOs)

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Service Availability | 99.9% | <99% (2 min) |
| Error Rate | <1% | >5% (5 min) |
| P95 Latency | <5s | >10s (5 min) |
| Memory Usage | <70% | >80% (15 min) |

### Dashboards

1. **Application Health** - Overall service status
2. **API Performance** - External API monitoring
3. **Database & Cache** - Data layer metrics
4. **Business Metrics** - Product analytics

### Alert Severity

- **P1 (Critical):** Immediate response required
  - Service Down
  - High Error Rate (>5%)
  - High Latency (>10s)

- **P2 (Warning):** Investigation needed
  - Elevated Error Rate (>2%)
  - Slow Response Time (>5s)
  - High Memory Usage (>80%)

## Common Operations

### Check Service Health

```bash
# Cloud Run service status
gcloud run services describe rxmatch --region=us-central1

# Recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rxmatch" --limit=50

# Active alerts
gcloud alpha monitoring policies list --filter="displayName:RxMatch"
```

### Respond to Alerts

1. **Receive alert email** with incident details
2. **Check RUNBOOK.md** for specific alert procedures
3. **Follow diagnostic steps** to identify root cause
4. **Apply resolution** as documented
5. **Verify recovery** via dashboards
6. **Document incident** for post-mortem

### View Metrics

```bash
# Request rate
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# Latency
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Memory usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RxMatch Application                       │
│                     (Cloud Run)                              │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ Automatic Metrics Collection
           │
┌──────────▼──────────────────────────────────────────────────┐
│                  GCP Cloud Monitoring                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboards  │  │    Alerts    │  │  Log Metrics │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────┬──────────────────────────────────────────────────┘
           │
           │ Email Notifications
           │
┌──────────▼──────────────────────────────────────────────────┐
│              Primary & Secondary On-Call                     │
└─────────────────────────────────────────────────────────────┘
```

## Resources

### Configuration Files

- `/terraform/monitoring.tf` - Terraform configuration
- `/terraform/terraform.tfvars.example` - Variable template
- `/scripts/setup-monitoring.sh` - Shell setup script
- `/scripts/test-alerts.sh` - Alert testing script

### External Links

- [GCP Cloud Monitoring](https://cloud.google.com/monitoring/docs)
- [Cloud Run Monitoring](https://cloud.google.com/run/docs/monitoring)
- [Alert Best Practices](https://cloud.google.com/monitoring/alerts/alerting-best-practices)
- [Performance Optimization](../PERFORMANCE_OPTIMIZATION.md)

### Support

- **GCP Support:** https://cloud.google.com/support
- **Service Status:** https://status.cloud.google.com/
- **Community:** https://stackoverflow.com/questions/tagged/google-cloud-platform

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Review alert incidents | Daily | On-call |
| Check dashboard metrics | Daily | On-call |
| Tune alert thresholds | Weekly | DevOps |
| Update documentation | Monthly | DevOps |
| Alert policy audit | Quarterly | Engineering |

## Version History

- **v1.0** (2025-11-12) - Initial monitoring setup
  - 4 dashboards created
  - 6 alert policies configured
  - Email notifications enabled
  - Documentation completed

## Contributing

When updating monitoring:

1. Update Terraform configuration
2. Test changes in staging
3. Update documentation (this file, MONITORING.md, RUNBOOK.md)
4. Apply to production
5. Notify team of changes

## Questions?

Contact DevOps team or refer to the detailed guides:
- [MONITORING.md](./MONITORING.md) - Setup and configuration
- [RUNBOOK.md](./RUNBOOK.md) - Operations and troubleshooting
