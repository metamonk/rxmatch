# GCP Setup Guide - Console (GUI) Instructions

Follow these steps to set up Workload Identity Federation for GitHub Actions.

**Project:** `rxmatch-478003`
**Region:** `us-central1`

---

## Step 1: Get Your Project Number (2 min)

### Navigate:
1. Go to [GCP Console](https://console.cloud.google.com)
2. Make sure you're in project `rxmatch-478003`
3. Click **Dashboard** in the left menu

### Find Project Number:
Look for the card that says "Project Info" - you'll see:
- **Project name:** (your project name)
- **Project number:** 123456789012 ← Copy this number
- **Project ID:** rxmatch-478003

**📋 Write down your project number:** _______________

---

## Step 2: Create Service Account (5 min)

### Navigate:
1. In the left menu, go to: **IAM & Admin** → **Service Accounts**
2. Click **+ CREATE SERVICE ACCOUNT** (top of page)

### Fill out the form:

#### Step 1 of 3 - Service account details:
- **Service account name:** `github-actions-deployer`
- **Service account ID:** (auto-fills: `github-actions-deployer`)
- **Description:** `Service account for GitHub Actions to deploy to Cloud Run`
- Click **CREATE AND CONTINUE**

#### Step 2 of 3 - Grant this service account access:
**Skip this step for now** - we'll add permissions next
- Click **CONTINUE**

#### Step 3 of 3 - Grant users access:
**Skip this step**
- Click **DONE**

### Result:
You should now see `github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com` in the list.

**📋 Service account email:** `github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com`

---

## Step 3: Grant IAM Roles to Service Account (5 min)

### Navigate:
1. Go to: **IAM & Admin** → **IAM**
2. Click **+ GRANT ACCESS** (top of page)

### Add Permissions - Part 1: Cloud Run Admin

**New principals:**
```
github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com
```

**Assign roles:**
- Click **Select a role** dropdown
- Search for: `Cloud Run Admin`
- Select: **Cloud Run Admin**
- Click **+ ADD ANOTHER ROLE**

### Add More Roles (in the same form):

**Role 2:** Search `Artifact Registry Writer` → Select it → **+ ADD ANOTHER ROLE**

**Role 3:** Search `Service Account User` → Select it → **+ ADD ANOTHER ROLE**

**Role 4:** Search `Secret Manager Secret Accessor` → Select it

**You should now have 4 roles assigned:**
- ✅ Cloud Run Admin
- ✅ Artifact Registry Writer
- ✅ Service Account User
- ✅ Secret Manager Secret Accessor

Click **SAVE**

---

## Step 4: Create Workload Identity Pool (5 min)

### Navigate:
1. Go to: **IAM & Admin** → **Workload Identity Federation**
2. Click **+ CREATE POOL** (top of page)

### Fill out the form:

**Pool name:**
```
github-pool
```

**Pool ID:** (auto-fills: `github-pool`)

**Description:**
```
Workload Identity Pool for GitHub Actions
```

**Enable pool:** ✅ (leave checked)

Click **CONTINUE**

---

## Step 5: Configure Provider (GitHub) (5 min)

You should now be on the "Configure provider" page.

### Provider Type:
Select **OpenID Connect (OIDC)**

### Provider details:

**Provider name:**
```
github-provider
```

**Provider ID:** (auto-fills: `github-provider`)

**Issuer (URL):**
```
https://token.actions.githubusercontent.com
```

**Audiences:**
Select **Default audience** (radio button)

### Attribute Mapping:

Click **+ ADD MAPPING** for each of these:

**Mapping 1:**
- Google attribute: `google.subject`
- OIDC attribute: `assertion.sub`

**Mapping 2:**
- Google attribute: `attribute.actor`
- OIDC attribute: `assertion.actor`

**Mapping 3:**
- Google attribute: `attribute.repository`
- OIDC attribute: `assertion.repository`

**Mapping 4:**
- Google attribute: `attribute.repository_owner`
- OIDC attribute: `assertion.repository_owner`

### Attribute Conditions (IMPORTANT):

Click **ADD CONDITION**

**Condition:**
```
assertion.repository_owner == 'YOUR_GITHUB_USERNAME'
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

**Example:** If your GitHub is `https://github.com/zenobioperez`, use:
```
assertion.repository_owner == 'zenobioperez'
```

Click **SAVE**

---

## Step 6: Link Service Account to Workload Identity (5 min)

### Navigate:
1. Stay in **IAM & Admin** → **Workload Identity Federation**
2. Click on **github-pool** (the pool you just created)
3. Click on **github-provider** (the provider you just created)
4. Click **GRANT ACCESS** button

### Fill out the form:

**Service account:**
```
github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com
```

**Select principals:**

**Attribute name:** `repository`

**Attribute value:**
```
YOUR_GITHUB_USERNAME/rxmatch
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

**Example:** If your repo is `https://github.com/zenobioperez/rxmatch`, use:
```
zenobioperez/rxmatch
```

Click **SAVE**

---

## Step 7: Get the Workload Identity Provider Path (2 min)

### Navigate:
1. Stay in **Workload Identity Federation**
2. Click on **github-pool**
3. Click on **github-provider**
4. Look for **Provider ID** or **Resource name**

### Copy the full path:

It will look like:
```
projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

**📋 Copy this entire path** - you'll need it for GitHub secrets!

---

## Step 8: Add GitHub Secrets (5 min)

Go back to GitHub → Repository → Settings → Secrets and variables → Actions

### Add Secret #1:

**Name:**
```
GCP_PROJECT_ID
```

**Value:**
```
rxmatch-478003
```

Click **Add secret**

### Add Secret #2:

**Name:**
```
GCP_WORKLOAD_IDENTITY_PROVIDER
```

**Value:**
```
projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

Replace `YOUR_PROJECT_NUMBER` with the number from Step 1.

Click **Add secret**

### Add Secret #3:

**Name:**
```
GCP_SERVICE_ACCOUNT
```

**Value:**
```
github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com
```

Click **Add secret**

---

## ✅ Verification Checklist

Before testing deployment:

- [ ] Service account created: `github-actions-deployer@rxmatch-478003.iam.gserviceaccount.com`
- [ ] Service account has 4 IAM roles
- [ ] Workload Identity Pool created: `github-pool`
- [ ] Workload Identity Provider created: `github-provider`
- [ ] Provider is linked to service account with repository filter
- [ ] All 3 GitHub secrets added
- [ ] GitHub username is correct in attribute condition

---

## 🧪 Test Deployment (Optional)

Once all secrets are added, test the deployment:

```bash
# From your local repository
git add .
git commit -m "feat: configure GCP deployment"
git push origin main
```

Then go to:
- GitHub → Actions tab
- Watch the workflow run
- Check for any errors

---

## 🆘 Troubleshooting

### Error: "Permission denied"
- Check that all 4 IAM roles are granted to the service account
- Verify the service account email is correct in GitHub secrets

### Error: "Workload identity pool not found"
- Double-check the `GCP_WORKLOAD_IDENTITY_PROVIDER` secret value
- Make sure you copied the full path including `projects/...`

### Error: "Repository not allowed"
- Check the attribute condition in the provider settings
- Make sure your GitHub username is correct
- Verify repository name matches exactly

---

**Estimated total time:** 25-30 minutes

**Next step after this:** Add Cloud SQL and Redis (or deploy without them first)
