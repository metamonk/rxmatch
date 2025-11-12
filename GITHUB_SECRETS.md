# GitHub Secrets Configuration

## Required GitHub Secrets

Go to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

---

## 1. GCP_PROJECT_ID

**Value:**
```
rxmatch-478003
```

**Description:** Your Google Cloud project ID

---

## 2. GCP_WORKLOAD_IDENTITY_PROVIDER

**Value format:**
```
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

**How to get this value:**

### Step 1: Get Project Number
```bash
gcloud projects describe rxmatch-478003 --format="value(projectNumber)"
```
Or find it in: GCP Console → Dashboard (shown as "Project number")

### Step 2: Create Workload Identity Pool (if not exists)
```bash
# Create pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="rxmatch-478003" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="rxmatch-478003" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'YOUR_GITHUB_USERNAME'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Step 3: Get the full resource name
```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project="rxmatch-478003" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

**Expected output example:**
```
projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

---

## 3. GCP_SERVICE_ACCOUNT

**Value format:**
```
github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com
```

### How to create:

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --project=rxmatch-478003 \
  --display-name="GitHub Actions Deployer"

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding rxmatch-478003 \
  --member="serviceAccount:github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Artifact Registry Writer role
gcloud projects add-iam-policy-binding rxmatch-478003 \
  --member="serviceAccount:github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Service Account User role
gcloud projects add-iam-policy-binding rxmatch-478003 \
  --member="serviceAccount:github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager Accessor role
gcloud projects add-iam-policy-binding rxmatch-478003 \
  --member="serviceAccount:github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Allow GitHub to impersonate this service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com \
  --project=rxmatch-478003 \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/rxmatch"
```

Replace `PROJECT_NUMBER` with your actual project number and `YOUR_GITHUB_USERNAME` with your GitHub username.

---

## Summary

**Three secrets needed:**

| Secret Name | Example Value | Where to Get |
|------------|---------------|--------------|
| `GCP_PROJECT_ID` | `rxmatch-478003` | ✅ Already known |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123.../github-provider` | Run gcloud commands above |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com` | Create service account above |

---

## Quick Setup Checklist

- [ ] Install gcloud CLI (if not installed)
- [ ] Authenticate: `gcloud auth login`
- [ ] Set project: `gcloud config set project rxmatch-478003`
- [ ] Get project number
- [ ] Create Workload Identity Pool and Provider
- [ ] Create service account
- [ ] Grant IAM roles to service account
- [ ] Allow GitHub to impersonate service account
- [ ] Add all 3 secrets to GitHub repository

---

## Verification

After adding secrets, you can test by:
1. Push to `main` branch
2. Go to **Actions** tab in GitHub
3. Watch the deployment workflow run
4. Check for any authentication errors

---

## Alternative: Console Setup (No CLI)

If you prefer using GCP Console instead of gcloud CLI:

1. **Service Account:** IAM & Admin → Service Accounts → Create
2. **Workload Identity:** IAM & Admin → Workload Identity Federation → Create Pool
3. **IAM Roles:** IAM & Admin → IAM → Grant Access → Add roles

See GCP_SETUP.md for detailed console instructions.
