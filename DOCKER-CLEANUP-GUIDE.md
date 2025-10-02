# Docker Image Cleanup and Prevention Guide

## Problem
Your Google Cloud Artifact Registry repositories have grown too large:
- `gcf-artifacts`: **29.2 GB** (Cloud Functions images)
- `cloud-run-source-deploy`: **2.7 GB** (Cloud Run images)

This happens because every Cloud Functions deployment creates a new Docker image, and old versions are not automatically deleted.

## Solution Overview

### 1. Manual Cleanup (One-time)
Clean up old Docker images to immediately reduce size.

### 2. Automatic Lifecycle Policies (Prevention)
Set up automatic cleanup rules to prevent future bloat.

### 3. Optimize Deployments (Best Practices)
Reduce the size of future Docker images.

---

## Step 1: Manual Cleanup

### Option A: Safe Cleanup (Recommended)
Keep the 5 most recent versions of each function, delete older ones.

```bash
# Run the cleanup script
./cleanup-docker-images.sh
```

### Option B: Aggressive Cleanup
If you want to clean up more aggressively (keep only 2-3 versions):

```bash
# Delete all images older than 30 days
gcloud artifacts docker images list \
  asia-southeast1-docker.pkg.dev/$(gcloud config get-value project)/gcf-artifacts \
  --format="value(package,version)" \
  --include-tags \
  --filter="createTime<'-P30D'" | \
while read package version; do
  gcloud artifacts docker images delete "${package}@${version}" --quiet --delete-tags
done
```

---

## Step 2: Set Up Lifecycle Policies

### For Cloud Functions (gcf-artifacts)

Apply the lifecycle policy to automatically clean up old images:

```bash
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --location=asia-southeast1 \
  --policy=gcf-artifacts-lifecycle-policy.json
```

**This policy will:**
- ✅ Keep only the 5 most recent versions of each function
- ✅ Delete cache images older than 7 days
- ✅ Delete untagged images older than 30 days

### For Cloud Run (cloud-run-source-deploy)

```bash
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy \
  --location=asia-southeast1 \
  --policy=cloud-run-lifecycle-policy.json
```

**This policy will:**
- ✅ Keep only the 3 most recent versions
- ✅ Delete untagged images older than 14 days

### Verify Lifecycle Policies

```bash
# Check gcf-artifacts policy
gcloud artifacts repositories describe gcf-artifacts \
  --location=asia-southeast1 \
  --format="yaml(cleanupPolicies)"

# Check cloud-run policy
gcloud artifacts repositories describe cloud-run-source-deploy \
  --location=asia-southeast1 \
  --format="yaml(cleanupPolicies)"
```

---

## Step 3: Optimize Future Deployments

### A. Optimize Dependencies

Review your `functions/package.json` and remove unused dependencies:

**Large dependencies currently installed:**
- `@tensorflow/tfjs` (very large, ~200MB)
- `@google-cloud/vision` (if not needed)

**Action:** If you're using the external Python face recognition service, you may not need TensorFlow in your Cloud Functions.

### B. Use .gcloudignore

Create a `.gcloudignore` file in your `functions/` directory to exclude unnecessary files:

```
node_modules/
.git/
.gitignore
*.log
test/
*.test.js
.env
README.md
```

### C. Deploy Only What Changed

Instead of deploying all functions at once, deploy only the functions that changed:

```bash
# Deploy a specific function
firebase deploy --only functions:functionName
```

### D. Use Docker Multi-Stage Builds (Advanced)

For Cloud Run, use multi-stage builds to reduce final image size.

---

## Monitoring and Maintenance

### Check Repository Sizes

```bash
gcloud artifacts repositories list \
  --location=asia-southeast1 \
  --format="table(name,format,sizeBytes.size(units_out=G,precision=2))"
```

### Set Up Alerts

Create a budget alert for Artifact Registry storage:

```bash
gcloud billing budgets create \
  --billing-account=$(gcloud billing projects describe $(gcloud config get-value project) --format="value(billingAccountName)") \
  --display-name="Artifact Registry Storage Alert" \
  --budget-amount=100USD \
  --threshold-rule=percent=80
```

### Regular Cleanup Schedule

Add to your cron or CI/CD:

```bash
# Run cleanup monthly
0 0 1 * * /path/to/cleanup-docker-images.sh
```

---

## Expected Results

After cleanup and implementing lifecycle policies:

| Repository | Before | Expected After | Savings |
|------------|--------|----------------|---------|
| gcf-artifacts | 29.2 GB | ~5-8 GB | ~22 GB |
| cloud-run-source-deploy | 2.7 GB | ~1 GB | ~1.7 GB |
| **Total** | **31.9 GB** | **~6-9 GB** | **~23 GB** |

---

## Troubleshooting

### If cleanup fails with permission errors:

```bash
# Ensure you have the right permissions
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/artifactregistry.repoAdmin"
```

### If images are still in use:

Cloud Functions may be using older versions. The cleanup script will skip images that are currently deployed and in use.

### To force delete (use with caution):

```bash
gcloud artifacts docker images delete IMAGE_PATH --delete-tags --force
```

---

## Cost Impact

**Current storage cost estimate:**
- 32 GB × $0.10/GB/month = ~$3.20/month

**After cleanup:**
- 8 GB × $0.10/GB/month = ~$0.80/month

**Monthly savings: ~$2.40**

---

## Quick Start Commands

```bash
# 1. Clean up old images (safe)
./cleanup-docker-images.sh

# 2. Apply lifecycle policies
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --location=asia-southeast1 \
  --policy=gcf-artifacts-lifecycle-policy.json

gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy \
  --location=asia-southeast1 \
  --policy=cloud-run-lifecycle-policy.json

# 3. Verify cleanup
gcloud artifacts repositories list --location=asia-southeast1
```

---

## Summary

✅ **Immediate action:** Run `./cleanup-docker-images.sh` to reduce size  
✅ **Prevention:** Apply lifecycle policies to both repositories  
✅ **Optimization:** Review and remove unused dependencies  
✅ **Monitoring:** Set up alerts and schedule regular checks  

This will reduce your Docker storage by ~70% and prevent future bloat automatically.
