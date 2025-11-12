# RxMatch Monitoring Deployment Guide

**Task 17: Monitoring and Alert Configuration**
**Date:** 2025-11-12

This guide provides step-by-step instructions for deploying monitoring infrastructure for RxMatch.

---

## Prerequisites

### Required Tools

- **gcloud CLI** (latest version)
- **Terraform** (>= 1.0) - for Terraform deployment
- **GCP Account** with appropriate permissions
- **Email addresses** for alert notifications

### Required Permissions

Your GCP account needs:
- `monitoring.admin` - Create dashboards and alerts
- `run.viewer` - View Cloud Run services
- `logging.viewer` - View logs
- `iam.serviceAccountUser` - For Terraform

### Required Information

Before starting, gather:
- GCP Project ID
- GCP Region (e.g., `us-central1`)
- Cloud Run service name (e.g., `rxmatch`)
- Primary alert email address
- Secondary alert email address (optional)

---

## Deployment Options

Choose one of three deployment methods:

1. **Terraform** (Recommended) - Full infrastructure as code
2. **Shell Script** - Quick setup using gcloud CLI
3. **Manual** - GCP Console UI (for learning/testing)

---

## Option 1: Terraform Deployment (Recommended)

### Step 1: Install Terraform

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

### Step 2: Authenticate with GCP

```bash
# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable run.googleapis.com
```

### Step 3: Configure Variables

```bash
cd terraform/

# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**terraform.tfvars content:**
```hcl
project_id   = "your-gcp-project-id"
region       = "us-central1"
service_name = "rxmatch"

# Primary email (required)
alert_email = "alerts@yourdomain.com"

# Secondary email (optional, leave empty if not needed)
alert_email_secondary = "on-call@yourdomain.com"
```

### Step 4: Initialize Terraform

```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format files
terraform fmt
```

### Step 5: Review Plan

```bash
# Generate execution plan
terraform plan

# Review what will be created:
# - 2 notification channels (primary + secondary)
# - 4 monitoring dashboards
# - 6 alert policies
```

### Step 6: Apply Configuration

```bash
# Apply configuration
terraform apply

# Type 'yes' when prompted

# Wait for resources to be created (2-3 minutes)
```

### Step 7: Verify Deployment

```bash
# Check notification channels
gcloud alpha monitoring channels list

# Check alert policies
gcloud alpha monitoring policies list --filter="displayName:RxMatch"

# View dashboard URLs in Terraform output
terraform output dashboard_urls
```

### Step 8: Access Dashboards

Terraform will output dashboard URLs. Visit each to verify:

```
Outputs:

dashboard_urls = {
  "application_health" = "https://console.cloud.google.com/monitoring/dashboards/custom/..."
  "api_performance"    = "https://console.cloud.google.com/monitoring/dashboards/custom/..."
  "database_cache"     = "https://console.cloud.google.com/monitoring/dashboards/custom/..."
  "business_metrics"   = "https://console.cloud.google.com/monitoring/dashboards/custom/..."
}
```

### Updating Configuration

To update thresholds or add alerts:

```bash
# Edit monitoring.tf
nano monitoring.tf

# Review changes
terraform plan

# Apply updates
terraform apply
```

### Destroying Resources (Development Only)

```bash
# Remove all monitoring resources
terraform destroy

# WARNING: This deletes all dashboards and alerts!
```

---

## Option 2: Shell Script Deployment

### Step 1: Set Environment Variables

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_SERVICE_NAME="rxmatch"
export ALERT_EMAIL="alerts@yourdomain.com"
export ALERT_EMAIL_SECONDARY="on-call@yourdomain.com"  # Optional
```

### Step 2: Authenticate

```bash
# Login
gcloud auth login

# Set project
gcloud config set project $GCP_PROJECT_ID

# Enable APIs
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### Step 3: Run Setup Script

```bash
# Make script executable
chmod +x scripts/setup-monitoring.sh

# Run script
./scripts/setup-monitoring.sh
```

The script will:
1. Check prerequisites
2. Create notification channels
3. Create alert policies
4. List created resources

### Step 4: Create Dashboards Manually

**Note:** gcloud CLI cannot create dashboards. You must:
- Use Terraform (Option 1), OR
- Create manually via GCP Console (Option 3)

### Verification

```bash
# List notification channels
gcloud alpha monitoring channels list

# List alert policies
gcloud alpha monitoring policies list
```

---

## Option 3: Manual Deployment (GCP Console)

### Step 1: Create Notification Channels

1. Go to **GCP Console → Monitoring → Alerting → Notification Channels**
2. Click **Create Notification Channel**
3. Select **Email**
4. Configure:
   - Display Name: `Primary Alert Email`
   - Email Address: Your primary email
5. Click **Save**
6. Repeat for secondary email (optional)

### Step 2: Create Alert Policies

For each alert in [MONITORING.md Alert Policies section](./MONITORING.md#alert-policies):

1. Go to **Monitoring → Alerting → Create Policy**
2. Click **Add Condition**
3. Configure condition:
   - **Metric:** As specified in documentation
   - **Filter:** `resource.type="cloud_run_revision" AND resource.labels.service_name="rxmatch"`
   - **Threshold:** As specified
   - **Duration:** As specified
4. Click **Next**
5. Configure notifications:
   - Select notification channels
6. Add documentation from [MONITORING.md](./MONITORING.md)
7. Name the alert
8. Click **Create Policy**

**Repeat for all 6 alerts:**
1. Service Down
2. High Error Rate (>5%)
3. High Latency (>10s)
4. Elevated Error Rate (>2%)
5. Slow Response Time (>5s)
6. High Memory Usage (>80%)

### Step 3: Create Dashboards

For each dashboard in [MONITORING.md Dashboards section](./MONITORING.md#dashboards):

1. Go to **Monitoring → Dashboards → Create Dashboard**
2. Name the dashboard (e.g., "RxMatch - Application Health")
3. Click **Add Chart**
4. For each metric widget:
   - Select metric type
   - Configure filter
   - Set aggregation
   - Customize visualization
5. Arrange widgets in grid layout
6. Click **Save**

**Create 4 dashboards:**
1. Application Health
2. API Performance
3. Database & Cache
4. Business Metrics

---

## Post-Deployment Tasks

### 1. Test Alert Notifications

```bash
# Set service URL
export SERVICE_URL="https://your-service.run.app"

# Run test script
./scripts/test-alerts.sh

# Choose option 2 to test error rate alert
# Choose option 7 to generate normal traffic
```

### 2. Verify Email Notifications

After running tests:
- Check primary email inbox
- Verify alert emails are received
- Check spam folder if not received
- Verify email contains useful information

### 3. Tune Alert Thresholds

Based on baseline traffic:
- Review dashboard metrics for 24-48 hours
- Identify normal operating ranges
- Adjust alert thresholds if needed
- Update documentation

### 4. Configure Log-Based Metrics (Optional)

For custom business metrics:

1. Go to **Logging → Logs-based Metrics**
2. Click **Create Metric**
3. Configure metric:
   - Name: `prescription_processed_count`
   - Filter: `jsonPayload.event="prescription_processed"`
   - Type: Counter
4. Click **Create Metric**
5. Add to Business Metrics dashboard

See [MONITORING.md Custom Metrics section](./MONITORING.md#custom-metrics) for details.

### 5. Document Dashboard URLs

Save dashboard URLs for easy access:

```bash
# List dashboards
gcloud monitoring dashboards list --format="table(name,displayName)"

# Save to team wiki or documentation
```

### 6. Set Up On-Call Rotation (Optional)

If using on-call rotation:
1. Create shared email aliases
2. Configure forwarding rules
3. Document rotation schedule
4. Update notification channels

---

## Verification Checklist

After deployment, verify:

- [ ] **Notification Channels Created**
  - Primary email channel exists
  - Secondary email channel exists (if configured)
  - Test email received successfully

- [ ] **Alert Policies Created**
  - 6 alert policies exist
  - All policies enabled
  - Notification channels assigned correctly

- [ ] **Dashboards Created**
  - 4 dashboards exist
  - All widgets displaying data
  - Metrics updating in real-time

- [ ] **Metrics Flowing**
  - Cloud Run metrics visible
  - Logs being collected
  - No gaps in data

- [ ] **Alerts Tested**
  - At least one alert triggered successfully
  - Email notification received
  - Alert auto-resolved after fix

- [ ] **Documentation Updated**
  - Dashboard URLs documented
  - Alert procedures reviewed
  - Runbook accessible to team

---

## Troubleshooting Deployment

### Issue: Terraform Apply Fails

**Error:** "insufficient permissions"

**Solution:**
```bash
# Add required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/monitoring.admin"
```

### Issue: Alert Not Triggering

**Possible Causes:**
- Notification channel not verified
- Alert policy disabled
- Condition not met
- Metric not being reported

**Solution:**
1. Verify email address
2. Check alert policy is enabled
3. Manually trigger condition
4. Check metric in Metrics Explorer

### Issue: Dashboard Shows No Data

**Possible Causes:**
- Service not deployed
- Incorrect metric filter
- Time range too narrow

**Solution:**
1. Verify service is running
2. Check metric type and filter
3. Expand time range to 1 hour
4. Check Logs Explorer for data

### Issue: Email Not Received

**Solutions:**
1. Check spam folder
2. Verify email address
3. Re-send test notification
4. Try different email provider

---

## Maintenance

### Regular Updates

```bash
# Update Terraform
cd terraform/
terraform plan
terraform apply

# Or update via script
./scripts/setup-monitoring.sh
```

### Backup Configuration

```bash
# Export Terraform state
cd terraform/
terraform state pull > backup-state.json

# Export alert policies
gcloud alpha monitoring policies list --format=json > backup-alerts.json

# Export dashboards
gcloud monitoring dashboards list --format=json > backup-dashboards.json
```

### Disaster Recovery

If monitoring infrastructure is lost:

```bash
# Restore from Terraform
cd terraform/
terraform apply

# Or re-run setup script
./scripts/setup-monitoring.sh
```

---

## Cost Considerations

### GCP Cloud Monitoring Pricing

- **Metrics:** First 150 MB/month free, then $0.258/MB
- **Logs:** First 50 GB/month free, then $0.50/GB
- **Dashboards:** Free
- **Alerts:** Free (email notifications)

### Estimated Monthly Cost

For RxMatch with moderate traffic:
- **Metrics:** ~$5-10/month
- **Logs:** ~$10-20/month
- **Total:** ~$15-30/month

### Cost Optimization

- Use log sampling for high-volume logs
- Exclude health check logs
- Set log retention to 30 days
- Use log exclusions for debug logs

---

## Next Steps

After successful deployment:

1. **Review Documentation:**
   - [MONITORING.md](./MONITORING.md) - Detailed monitoring guide
   - [RUNBOOK.md](./RUNBOOK.md) - Operations procedures

2. **Train Team:**
   - Share dashboard URLs
   - Review alert procedures
   - Practice incident response

3. **Monitor Performance:**
   - Watch dashboards for 1 week
   - Tune alert thresholds
   - Document baseline metrics

4. **Continuous Improvement:**
   - Add custom metrics
   - Create additional dashboards
   - Refine alert policies

---

## Support

- **GCP Support:** https://cloud.google.com/support
- **Documentation:** [MONITORING.md](./MONITORING.md)
- **Runbook:** [RUNBOOK.md](./RUNBOOK.md)
- **Terraform Issues:** Check `terraform.log`
- **Script Issues:** Check script output

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
