# GCP Cloud Run Setup Guide

This guide walks through setting up Google Cloud Platform for the RxMatch application deployment.

## Prerequisites

- Google Cloud Platform account
- GitHub repository
- gcloud CLI (optional, for local management)

---

## Part 1: GCP Project Setup

### 1. Create New GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** > **New Project**
3. Name: `rxmatch` or `rxmatch-prod`
4. Note the **Project ID** (e.g., `rxmatch-123456`)

### 2. Enable Required APIs

Navigate to **APIs & Services** > **Library** and enable:

```bash
# Core services
- Cloud Run API
- Artifact Registry API
- Cloud Build API
- Secret Manager API

# Database & caching
- Cloud SQL Admin API (for PostgreSQL)
- Memorystore for Redis API

# Optional
- Cloud Logging API
- Cloud Monitoring API
```

**Quick Link:** `https://console.cloud.google.com/apis/library`

### 3. Create Artifact Registry Repository

1. Go to **Artifact Registry** > **Repositories**
2. Click **+ Create Repository**
   - Name: `rxmatch`
   - Format: `Docker`
   - Location: `us-central1` (or your preferred region)
   - Encryption: `Google-managed encryption key`
3. Click **Create**

---

## Part 2: Database & Caching Setup

### PostgreSQL (Cloud SQL)

1. Go to **SQL** > **Create Instance**
2. Choose **PostgreSQL**
3. Configure:
   - Instance ID: `rxmatch-db`
   - Password: Generate strong password
   - Version: PostgreSQL 15
   - Region: `us-central1` (match Cloud Run)
   - Machine type: `Shared core` (1 vCPU, 1.7 GB) for staging
4. **Connections** tab:
   - Enable **Private IP** (recommended for production)
   - Or use **Public IP** with Cloud SQL Proxy for staging
5. Click **Create**

**Get Connection String:**
```bash
# Format: postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
postgresql://postgres:YOUR_PASSWORD@/rxmatch?host=/cloudsql/rxmatch-123456:us-central1:rxmatch-db
```

### Redis (Memorystore)

1. Go to **Memorystore** > **Redis**
2. Click **Create Instance**
3. Configure:
   - Instance ID: `rxmatch-cache`
   - Tier: `Basic` (for staging)
   - Region: `us-central1`
   - Capacity: `1 GB`
4. Click **Create**

**Get Connection Details:**
- Host: Available in instance details
- Port: `6379` (default)

---

## Part 3: Secret Manager

Store sensitive configuration in Secret Manager:

1. Go to **Security** > **Secret Manager**
2. Click **+ Create Secret** for each:

### Secrets to Create:

```bash
OPENAI_API_KEY
DATABASE_URL
REDIS_HOST
REDIS_PASSWORD
REDIS_PORT
FDA_API_KEY (if required)
```

**For each secret:**
- Name: Use exact names above
- Secret value: Paste the actual value
- Click **Create Secret**

---

## Part 4: GitHub Actions Setup (Workload Identity Federation)

This is the **recommended secure method** (no service account keys needed).

### 4.1: Create Service Account

```bash
# Via gcloud CLI (or use Console: IAM & Admin > Service Accounts)
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

# Grant necessary roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4.2: Set up Workload Identity Pool

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider (GitHub)
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'YOUR_GITHUB_USERNAME'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow GitHub Actions to impersonate service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/rxmatch"
```

**Get the Workload Identity Provider resource name:**
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project="PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

Output will be like:
```
projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

---

## Part 5: GitHub Secrets Configuration

Go to your GitHub repository > **Settings** > **Secrets and variables** > **Actions**

Click **New repository secret** for each:

```bash
GCP_PROJECT_ID
# Your GCP project ID (e.g., rxmatch-123456)

GCP_WORKLOAD_IDENTITY_PROVIDER
# Format: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider

GCP_SERVICE_ACCOUNT
# Format: github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
```

---

## Part 6: Test Local Build

```bash
# Test SvelteKit build
pnpm build

# Test Docker build locally
docker build -t rxmatch-test .

# Test Docker run locally
docker run -p 8080:8080 \
  -e OPENAI_API_KEY="your_key" \
  rxmatch-test
```

Visit `http://localhost:8080` to verify.

---

## Part 7: Deploy via GitHub Actions

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "feat: add GCP Cloud Run deployment pipeline"
   git push origin main
   ```

2. Go to **GitHub** > **Actions** tab
3. Watch the deployment workflow run
4. Once complete, get the Cloud Run URL from the logs

---

## Part 8: Cloud Run Configuration (Post-Deploy)

After first deployment, you can adjust Cloud Run settings:

1. Go to **Cloud Run** > Select `rxmatch` service
2. Click **Edit & Deploy New Revision**
3. Adjust:
   - **Memory:** 512 Mi (increase if needed)
   - **CPU:** 1 (increase for high traffic)
   - **Min instances:** 0 (cold starts) or 1 (always warm)
   - **Max instances:** 10 (or higher based on load)
   - **Request timeout:** 300 seconds (for long API calls)
   - **Concurrency:** 80 (requests per instance)

---

## Troubleshooting

### Build Fails
```bash
# Check GitHub Actions logs
# Verify all secrets are set correctly
# Test build locally first: pnpm build
```

### Deployment Fails
```bash
# Check Cloud Run logs: Cloud Run > Service > Logs
# Verify service account permissions
# Check Secret Manager access
```

### Database Connection Issues
```bash
# For Cloud SQL, verify:
# - Cloud SQL Admin API is enabled
# - Service account has cloudsql.client role
# - Connection string format is correct
```

### Redis Connection Issues
```bash
# Verify Memorystore instance is running
# Check VPC connector if using private IP
# Verify Redis host/port in secrets
```

---

## Cost Optimization Tips

1. **Cloud Run:** Use min instances = 0 for dev/staging
2. **Cloud SQL:** Use shared-core for staging, upgrade for prod
3. **Redis:** Use Basic tier (1GB) for staging
4. **Set up budget alerts:** Billing > Budgets & alerts

---

## Security Checklist

- [ ] All API keys stored in Secret Manager (not env vars)
- [ ] Service account follows principle of least privilege
- [ ] Workload Identity Federation configured (no JSON keys)
- [ ] Database uses private IP or Cloud SQL Proxy
- [ ] Cloud Run ingress set to "Allow all traffic" or configure Cloud Armor
- [ ] Enable Cloud Run authentication if needed

---

## Next Steps

1. Complete GCP project setup
2. Configure GitHub secrets
3. Push to trigger deployment
4. Monitor first deployment
5. Test deployed application
6. Set up monitoring/alerts

---

**Estimated Setup Time:** 30-45 minutes
**Monthly Cost (Staging):** ~$30-50 USD (minimal traffic)
**Monthly Cost (Production):** ~$100-300 USD (depends on usage)
