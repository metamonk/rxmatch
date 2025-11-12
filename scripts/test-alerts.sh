#!/bin/bash

# GCP Cloud Monitoring Alert Testing Script for RxMatch
# Task 17: Monitoring and Alert Configuration
#
# This script simulates various failure scenarios to test alert triggers

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_URL="${SERVICE_URL}"
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-rxmatch}"

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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ -z "$SERVICE_URL" ]; then
        log_error "SERVICE_URL environment variable is not set"
        echo "Usage: SERVICE_URL=https://rxmatch-xxx.run.app ./test-alerts.sh"
        exit 1
    fi

    if [ -z "$PROJECT_ID" ]; then
        log_error "GCP_PROJECT_ID environment variable is not set"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed"
        exit 1
    fi

    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

test_service_down_alert() {
    log_test "Testing 'Service Down' alert..."
    echo ""
    echo "To trigger this alert, we need to stop the service for >2 minutes."
    echo ""
    echo "Options:"
    echo "  1. Scale service to 0 instances (recommended for testing)"
    echo "  2. Stop the service temporarily"
    echo ""
    read -p "Scale service to 0 instances? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Scaling service to 0 instances..."
        gcloud run services update "$SERVICE_NAME" \
            --region="$REGION" \
            --min-instances=0 \
            --max-instances=0 \
            --project="$PROJECT_ID"

        log_info "Service scaled to 0. Waiting 3 minutes for alert to trigger..."
        log_warn "Check your email for alert notification"
        sleep 180

        log_info "Restoring service configuration..."
        gcloud run services update "$SERVICE_NAME" \
            --region="$REGION" \
            --min-instances=0 \
            --max-instances=10 \
            --project="$PROJECT_ID"

        log_info "Service restored"
    else
        log_info "Skipping service down test"
    fi
}

test_high_error_rate_alert() {
    log_test "Testing 'High Error Rate' alert..."
    echo ""
    echo "This will generate multiple 404 errors by requesting non-existent endpoints."
    echo "Target: >5% error rate for 5 minutes"
    echo ""
    read -p "Generate error traffic? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Generating error requests..."

        # Generate 100 error requests
        for i in {1..100}; do
            curl -s -o /dev/null -w "%{http_code}\n" "$SERVICE_URL/nonexistent-endpoint-$i" &

            # Rate limit to avoid overwhelming service
            if [ $((i % 10)) -eq 0 ]; then
                wait
                echo "Sent $i requests..."
                sleep 1
            fi
        done

        wait
        log_info "Generated 100 error requests"
        log_info "Error rate should now be 100%. Alert should trigger within 5 minutes."
        log_warn "Check your email for alert notification"
        log_info "Generate normal traffic to bring error rate back down"
    else
        log_info "Skipping error rate test"
    fi
}

test_high_latency_alert() {
    log_test "Testing 'High Latency' alert..."
    echo ""
    echo "This test requires adding artificial delays to the application."
    echo "Cannot be simulated externally without modifying application code."
    echo ""
    log_warn "To test this alert:"
    echo "  1. Add a sleep() or delay in your request handler (e.g., setTimeout(12000))"
    echo "  2. Deploy the modified code"
    echo "  3. Make requests to trigger the delay"
    echo "  4. Alert should trigger when p95 latency >10s for 5 minutes"
    echo ""
    log_info "Skipping latency test (requires code modification)"
}

test_database_connection_failure() {
    log_test "Testing 'Database Connection Failure' alert..."
    echo ""
    echo "This test requires temporarily disabling database access."
    echo ""
    log_warn "To test this alert:"
    echo "  1. Temporarily revoke Cloud Run service account database permissions"
    echo "  2. Or set an invalid DATABASE_URL in Cloud Run environment"
    echo "  3. Make requests that require database access"
    echo "  4. Check application logs for connection errors"
    echo "  5. Alert should trigger if configured for log-based metrics"
    echo ""
    log_info "Skipping database connection test (requires manual configuration)"
}

test_cache_failure() {
    log_test "Testing 'Cache Failure' alert..."
    echo ""
    echo "This test requires temporarily disabling Redis access."
    echo ""
    log_warn "To test this alert:"
    echo "  1. Temporarily set an invalid REDIS_PASSWORD in Cloud Run environment"
    echo "  2. Or revoke Redis access permissions"
    echo "  3. Make requests that use caching"
    echo "  4. Application should degrade gracefully"
    echo "  5. Check logs for cache connection errors"
    echo "  6. Alert should trigger if configured for log-based metrics"
    echo ""
    log_info "Skipping cache failure test (requires manual configuration)"
}

test_memory_usage_alert() {
    log_test "Testing 'High Memory Usage' alert..."
    echo ""
    echo "This test requires generating high memory load."
    echo ""
    read -p "Generate high load? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Generating concurrent requests to increase memory usage..."

        # Generate 50 concurrent requests
        for i in {1..50}; do
            curl -s -o /dev/null "$SERVICE_URL/api/validate" \
                -H "Content-Type: application/json" \
                -d '{"prescriptionText":"Test prescription for load testing"}' &
        done

        wait
        log_info "Load test completed"
        log_info "Check memory metrics in GCP Console: https://console.cloud.google.com/monitoring"
        log_warn "Memory alert triggers at >80% for 15 minutes"
    else
        log_info "Skipping memory usage test"
    fi
}

generate_normal_traffic() {
    log_test "Generating normal traffic to verify monitoring..."
    echo ""
    read -p "Generate normal traffic? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Generating 20 normal requests..."

        for i in {1..20}; do
            # Try to hit the health endpoint or homepage
            response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/" 2>/dev/null || echo "000")
            echo "Request $i: HTTP $response"
            sleep 0.5
        done

        log_info "Normal traffic generated"
        log_info "Check dashboards to verify metrics are being collected"
    else
        log_info "Skipping normal traffic generation"
    fi
}

check_current_alerts() {
    log_info "Checking current alert status..."
    echo ""

    gcloud alpha monitoring policies list \
        --filter="displayName:RxMatch" \
        --format="table(displayName,enabled,conditions[0].displayName)" \
        --project="$PROJECT_ID"

    echo ""
    log_info "View alert incidents at: https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
}

show_dashboard_links() {
    log_info "Dashboard Links:"
    echo ""
    echo "Application Health: https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"
    echo "Logs Explorer: https://console.cloud.google.com/logs/query?project=$PROJECT_ID"
    echo "Cloud Run Metrics: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
    echo ""
}

show_menu() {
    echo ""
    echo "========================================="
    echo "  RxMatch Alert Testing Menu"
    echo "========================================="
    echo ""
    echo "Choose a test to run:"
    echo ""
    echo "  1) Test Service Down Alert (scale to 0)"
    echo "  2) Test High Error Rate Alert (generate 404s)"
    echo "  3) Test High Latency Alert (info only)"
    echo "  4) Test Database Connection Failure (info only)"
    echo "  5) Test Cache Failure (info only)"
    echo "  6) Test High Memory Usage Alert (load test)"
    echo "  7) Generate Normal Traffic"
    echo "  8) Check Current Alert Status"
    echo "  9) Show Dashboard Links"
    echo "  0) Run All Automated Tests"
    echo "  q) Quit"
    echo ""
    read -p "Select option: " choice
    echo ""

    case $choice in
        1) test_service_down_alert ;;
        2) test_high_error_rate_alert ;;
        3) test_high_latency_alert ;;
        4) test_database_connection_failure ;;
        5) test_cache_failure ;;
        6) test_memory_usage_alert ;;
        7) generate_normal_traffic ;;
        8) check_current_alerts ;;
        9) show_dashboard_links ;;
        0)
            test_high_error_rate_alert
            test_memory_usage_alert
            generate_normal_traffic
            ;;
        q|Q)
            log_info "Exiting..."
            exit 0
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac

    show_menu
}

main() {
    log_info "RxMatch Alert Testing Tool"
    log_info "Project: $PROJECT_ID"
    log_info "Service: $SERVICE_NAME"
    log_info "Service URL: $SERVICE_URL"
    echo ""

    check_prerequisites
    show_dashboard_links
    show_menu
}

# Run main function
main
