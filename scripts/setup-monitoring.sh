#!/bin/bash

# GCP Cloud Monitoring Setup Script for RxMatch
# Task 17: Monitoring and Alert Configuration
#
# This script sets up monitoring dashboards and alert policies using gcloud CLI
# Alternative to Terraform for simpler deployments

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-rxmatch}"
ALERT_EMAIL="${ALERT_EMAIL}"
ALERT_EMAIL_SECONDARY="${ALERT_EMAIL_SECONDARY}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi

    # Check if logged in
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        log_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi

    # Check required environment variables
    if [ -z "$PROJECT_ID" ]; then
        log_error "GCP_PROJECT_ID environment variable is not set"
        exit 1
    fi

    if [ -z "$ALERT_EMAIL" ]; then
        log_error "ALERT_EMAIL environment variable is not set"
        exit 1
    fi

    # Set project
    gcloud config set project "$PROJECT_ID"

    log_info "Prerequisites check passed"
}

create_notification_channels() {
    log_info "Creating notification channels..."

    # Create primary email notification channel
    PRIMARY_CHANNEL=$(gcloud alpha monitoring channels create \
        --display-name="Primary Alert Email" \
        --type=email \
        --channel-labels=email_address="$ALERT_EMAIL" \
        --format="value(name)" 2>/dev/null || echo "")

    if [ -z "$PRIMARY_CHANNEL" ]; then
        # Channel might already exist, try to find it
        PRIMARY_CHANNEL=$(gcloud alpha monitoring channels list \
            --filter="displayName='Primary Alert Email'" \
            --format="value(name)" | head -n1)
    fi

    if [ -z "$PRIMARY_CHANNEL" ]; then
        log_error "Failed to create or find primary notification channel"
        exit 1
    fi

    log_info "Primary notification channel: $PRIMARY_CHANNEL"

    # Create secondary email notification channel if specified
    SECONDARY_CHANNEL=""
    if [ -n "$ALERT_EMAIL_SECONDARY" ]; then
        SECONDARY_CHANNEL=$(gcloud alpha monitoring channels create \
            --display-name="Secondary Alert Email" \
            --type=email \
            --channel-labels=email_address="$ALERT_EMAIL_SECONDARY" \
            --format="value(name)" 2>/dev/null || echo "")

        if [ -z "$SECONDARY_CHANNEL" ]; then
            SECONDARY_CHANNEL=$(gcloud alpha monitoring channels list \
                --filter="displayName='Secondary Alert Email'" \
                --format="value(name)" | head -n1)
        fi

        if [ -n "$SECONDARY_CHANNEL" ]; then
            log_info "Secondary notification channel: $SECONDARY_CHANNEL"
        fi
    fi
}

create_dashboards() {
    log_info "Creating monitoring dashboards..."

    # Note: gcloud doesn't support creating custom dashboards via CLI
    # Dashboards must be created via Terraform or GCP Console UI
    # This section provides the dashboard JSON files for manual import

    log_warn "Dashboard creation via gcloud CLI is not supported."
    log_info "Use Terraform or import dashboard JSON files manually via GCP Console."
    log_info "Dashboard JSON files are available in the terraform/ directory."
}

create_alert_policies() {
    log_info "Creating alert policies..."

    # Alert 1: Service Down
    log_info "Creating alert: Service Down"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL${SECONDARY_CHANNEL:+,$SECONDARY_CHANNEL}" \
        --display-name="RxMatch - Service Down (CRITICAL)" \
        --condition-display-name="Service unavailable for >2 minutes" \
        --condition-threshold-value=0.01 \
        --condition-threshold-duration=120s \
        --comparison=COMPARISON_LT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_RATE \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\"" \
        --documentation="RxMatch service is not receiving requests. Check Cloud Run service status and logs." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'Service Down' already exists or failed to create"

    # Alert 2: High Error Rate (Critical)
    log_info "Creating alert: High Error Rate >5%"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL${SECONDARY_CHANNEL:+,$SECONDARY_CHANNEL}" \
        --display-name="RxMatch - High Error Rate >5% (CRITICAL)" \
        --condition-display-name="Error rate >5% for 5 minutes" \
        --condition-threshold-value=0.05 \
        --condition-threshold-duration=300s \
        --comparison=COMPARISON_GT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_RATE \
        --aggregation-cross-series-reducer=REDUCE_SUM \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\" AND (metric.labels.response_code_class=\"4xx\" OR metric.labels.response_code_class=\"5xx\")" \
        --documentation="Error rate has exceeded 5%. Check application logs for error details. See RUNBOOK.md for troubleshooting steps." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'High Error Rate' already exists or failed to create"

    # Alert 3: High Latency
    log_info "Creating alert: High Latency >10s"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL" \
        --display-name="RxMatch - High Latency >10s (CRITICAL)" \
        --condition-display-name="P95 latency >10s for 5 minutes" \
        --condition-threshold-value=10000 \
        --condition-threshold-duration=300s \
        --comparison=COMPARISON_GT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_DELTA \
        --aggregation-cross-series-reducer=REDUCE_PERCENTILE_95 \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_latencies\"" \
        --documentation="P95 latency has exceeded 10 seconds. Check for API slowdowns (OpenAI, RxNorm, FDA) or database issues." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'High Latency' already exists or failed to create"

    # Alert 4: Elevated Error Rate (Warning)
    log_info "Creating alert: Elevated Error Rate >2%"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL" \
        --display-name="RxMatch - Elevated Error Rate >2% (WARNING)" \
        --condition-display-name="Error rate >2% for 10 minutes" \
        --condition-threshold-value=0.02 \
        --condition-threshold-duration=600s \
        --comparison=COMPARISON_GT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_RATE \
        --aggregation-cross-series-reducer=REDUCE_SUM \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\" AND (metric.labels.response_code_class=\"4xx\" OR metric.labels.response_code_class=\"5xx\")" \
        --documentation="Error rate is elevated. Monitor for continued increase. May indicate API issues or invalid requests." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'Elevated Error Rate' already exists or failed to create"

    # Alert 5: Slow Response Time (Warning)
    log_info "Creating alert: Slow Response Time >5s"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL" \
        --display-name="RxMatch - Slow Response Time >5s (WARNING)" \
        --condition-display-name="P95 latency >5s for 10 minutes" \
        --condition-threshold-value=5000 \
        --condition-threshold-duration=600s \
        --comparison=COMPARISON_GT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_DELTA \
        --aggregation-cross-series-reducer=REDUCE_PERCENTILE_95 \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_latencies\"" \
        --documentation="Response times are degraded. Check cache hit rates and external API performance." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'Slow Response Time' already exists or failed to create"

    # Alert 6: High Memory Usage (Warning)
    log_info "Creating alert: High Memory Usage >80%"
    gcloud alpha monitoring policies create \
        --notification-channels="$PRIMARY_CHANNEL" \
        --display-name="RxMatch - High Memory Usage >80% (WARNING)" \
        --condition-display-name="Memory utilization >80% for 15 minutes" \
        --condition-threshold-value=0.80 \
        --condition-threshold-duration=900s \
        --comparison=COMPARISON_GT \
        --aggregation-alignment-period=60s \
        --aggregation-per-series-aligner=ALIGN_MEAN \
        --aggregation-cross-series-reducer=REDUCE_MEAN \
        --if="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\"" \
        --documentation="Memory usage is high. Consider increasing container memory allocation or investigating memory leaks." \
        --documentation-format=text/markdown \
        --combiner=OR \
        2>/dev/null || log_warn "Alert 'High Memory Usage' already exists or failed to create"

    log_info "Alert policies created successfully"
}

list_monitoring_resources() {
    log_info "Listing monitoring resources..."

    echo ""
    echo "Notification Channels:"
    gcloud alpha monitoring channels list --format="table(name,displayName,labels)"

    echo ""
    echo "Alert Policies:"
    gcloud alpha monitoring policies list --format="table(name,displayName,enabled)"

    echo ""
    log_info "View dashboards at: https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"
}

main() {
    log_info "Starting RxMatch monitoring setup..."

    check_prerequisites
    create_notification_channels
    create_dashboards
    create_alert_policies
    list_monitoring_resources

    echo ""
    log_info "Monitoring setup completed successfully!"
    log_info "Next steps:"
    echo "  1. Create dashboards via GCP Console or use Terraform (terraform/monitoring.tf)"
    echo "  2. Test alerts by simulating failures (see scripts/test-alerts.sh)"
    echo "  3. Review documentation in docs/monitoring/MONITORING.md"
}

# Run main function
main
