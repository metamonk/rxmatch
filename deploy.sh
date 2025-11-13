#!/bin/bash

# RxMatch Cloud Run Deployment Script
# This script deploys the RxMatch application to Google Cloud Run

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="rxmatch-478003"
REGION="us-central1"
SERVICE_NAME="rxmatch"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   RxMatch Cloud Run Deployment        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/8]${NC} Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Step 2: Set GCP project
echo -e "${YELLOW}[2/8]${NC} Setting GCP project..."
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✓ Project set to ${PROJECT_ID}${NC}"
echo ""

# Step 3: Enable required APIs
echo -e "${YELLOW}[3/8]${NC} Enabling required GCP APIs..."
gcloud services enable \
    run.googleapis.com \
    containerregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    --quiet
echo -e "${GREEN}✓ APIs enabled${NC}"
echo ""

# Step 4: Build and push Docker image
echo -e "${YELLOW}[4/8]${NC} Building Docker image..."
gcloud builds submit --config cloudbuild.yaml
echo -e "${GREEN}✓ Image built and pushed to ${IMAGE_NAME}${NC}"
echo ""

# Step 5: Check for environment variables
echo -e "${YELLOW}[5/8]${NC} Checking environment variables..."
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please create .env file with production values"
    exit 1
fi

# Read environment variables from .env
source .env

if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}✗ OPENAI_API_KEY not set in .env${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables OK${NC}"
echo ""

# Step 6: Deploy to Cloud Run
echo -e "${YELLOW}[6/8]${NC} Deploying to Cloud Run..."

gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars "\
OPENAI_API_KEY=${OPENAI_API_KEY},\
OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini},\
OPENAI_MAX_TOKENS=${OPENAI_MAX_TOKENS:-1000},\
OPENAI_TEMPERATURE=${OPENAI_TEMPERATURE:-0.2},\
DATABASE_URL=${DATABASE_URL},\
DATABASE_POOL_MIN=${DATABASE_POOL_MIN:-2},\
DATABASE_POOL_MAX=${DATABASE_POOL_MAX:-10},\
REDIS_URL=${REDIS_URL},\
REDIS_TOKEN=${REDIS_TOKEN},\
REDIS_TTL_CACHE=${REDIS_TTL_CACHE:-604800},\
REDIS_TTL_RXCUI=${REDIS_TTL_RXCUI:-2592000},\
RXNORM_API_BASE=${RXNORM_API_BASE:-https://rxnav.nlm.nih.gov/REST},\
FDA_NDC_API_BASE=${FDA_NDC_API_BASE:-https://api.fda.gov/drug/ndc.json},\
NODE_ENV=production,\
FEATURE_CACHE_ENABLED=${FEATURE_CACHE_ENABLED:-true},\
FEATURE_RATE_LIMITING=${FEATURE_RATE_LIMITING:-true},\
FEATURE_ANALYTICS=${FEATURE_ANALYTICS:-false}" \
    --min-instances 0 \
    --max-instances 10 \
    --cpu 1 \
    --memory 512Mi \
    --timeout 60s \
    --concurrency 80 \
    --quiet

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# Step 7: Get service URL
echo -e "${YELLOW}[7/8]${NC} Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --format 'value(status.url)')
echo -e "${GREEN}✓ Service URL: ${SERVICE_URL}${NC}"
echo ""

# Step 8: Test deployment
echo -e "${YELLOW}[8/8]${NC} Testing deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${SERVICE_URL})

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Service is responding (HTTP ${HTTP_CODE})${NC}"
else
    echo -e "${YELLOW}⚠ Service returned HTTP ${HTTP_CODE}${NC}"
fi
echo ""

# Success summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deployment Successful! 🎉         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Service URL:${NC} ${SERVICE_URL}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Visit ${SERVICE_URL} to test the application"
echo "  2. Configure custom domain (optional)"
echo "  3. Set up monitoring: ./scripts/setup-monitoring.sh"
echo "  4. Review logs: gcloud run logs read ${SERVICE_NAME} --region ${REGION}"
echo ""
echo -e "${YELLOW}Note:${NC} Authentication is not configured. Add Firebase Auth for production use."
echo ""
