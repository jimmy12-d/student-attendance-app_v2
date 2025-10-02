# Docker Image Cleanup - Execution Summary

## Date: October 2, 2025

## Initial Problem
Your Google Cloud Artifact Registry repositories were excessively large:
- **gcf-artifacts**: 29.2 GB (Cloud Functions Docker images)
- **cloud-run-source-deploy**: 2.7 GB (Cloud Run images)
- **Total**: 31.9 GB

This is costing approximately **$3.20/month** in storage fees.

## Root Cause
- Every Cloud Functions deployment creates a new Docker image
- Old versions were never automatically deleted
- 56 old Docker images were accumulating (some dating back to August 2025)
- No lifecycle policies were in place

## Actions Taken

### 1. ✅ Created Lifecycle Policies (Prevention)

**For gcf-artifacts:**
```bash
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --location=asia-southeast1 \
  --policy=gcf-artifacts-lifecycle-policy.json
```

**Policy rules:**
- Keep only 5 most recent versions per function
- Delete untagged images older than 30 days

**For cloud-run-source-deploy:**
```bash
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy \
  --location=asia-southeast1 \
  --policy=cloud-run-lifecycle-policy.json
```

**Policy rules:**
- Keep only 3 most recent versions
- Delete untagged images older than 14 days

### 2. ✅ Manual Cleanup Executed

**Script:** `cleanup-docker-images.sh`

**Images deleted:**
- `notify_student_permission_status`: 1 old version
- `parent_bot_webhook`: 7 old versions
- `ssrrodwellattendance`: 31 old versions (largest cleanup)
- `telegram_webhook`: 17 old versions

**Total deleted: 56 Docker images**

### 3. ✅ Optimization Recommendations Documented

Created comprehensive guide: `DOCKER-CLEANUP-GUIDE.md`

## Expected Results

### Storage Reduction
| Repository | Before | After (Expected) | Savings |
|------------|--------|------------------|---------|
| gcf-artifacts | 29.2 GB | ~5-8 GB | ~22 GB (75%) |
| cloud-run-source-deploy | 2.7 GB | ~1 GB | ~1.7 GB (63%) |
| **TOTAL** | **31.9 GB** | **~6-9 GB** | **~23 GB (72%)** |

### Cost Reduction
- **Before**: $3.20/month
- **After**: $0.80/month
- **Monthly savings**: $2.40
- **Annual savings**: $28.80

## Future Prevention

### Automatic Cleanup
The lifecycle policies will now automatically:
- Delete old versions when new deployments happen
- Keep only the most recent 3-5 versions per function
- Remove untagged images after 14-30 days

### Best Practices Implemented
1. ✅ Lifecycle policies on both repositories
2. ✅ Automated cleanup scripts created
3. ✅ Documentation for future maintenance
4. 📋 Recommendation to optimize dependencies (pending)

## Monitoring

### Check repository sizes:
```bash
gcloud artifacts repositories list --location=asia-southeast1
```

### View cleanup policies:
```bash
gcloud artifacts repositories describe gcf-artifacts \
  --location=asia-southeast1 \
  --format="yaml(cleanupPolicies)"
```

## Next Steps (Optional Optimizations)

### 1. Optimize Dependencies
Your `functions/package.json` includes some large dependencies:
- `@tensorflow/tfjs` (~200MB) - Consider if needed since you use external Python service
- `@google-cloud/vision` - May not be needed if using external face recognition

### 2. Create .gcloudignore
Exclude unnecessary files from deployments:
```
node_modules/
.git/
*.log
test/
*.test.js
README.md
```

### 3. Selective Deployments
Deploy only changed functions instead of all:
```bash
firebase deploy --only functions:functionName
```

## Files Created
1. `cleanup-docker-images.sh` - Manual cleanup script
2. `dry-run-cleanup.sh` - Preview what will be deleted
3. `gcf-artifacts-lifecycle-policy.json` - Lifecycle policy for Cloud Functions
4. `cloud-run-lifecycle-policy.json` - Lifecycle policy for Cloud Run
5. `DOCKER-CLEANUP-GUIDE.md` - Comprehensive documentation
6. `DOCKER-CLEANUP-SUMMARY.md` - This summary

## Verification Commands

Check current size:
```bash
gcloud artifacts repositories list \
  --location=asia-southeast1 \
  --format="table(name,sizeBytes.size(units_out=G,precision=2))"
```

List remaining images:
```bash
gcloud artifacts docker images list \
  asia-southeast1-docker.pkg.dev/$(gcloud config get-value project)/gcf-artifacts \
  --format="table(package,createTime)" | head -20
```

## Status: ✅ COMPLETE

The Docker image cleanup has been successfully executed and lifecycle policies are now in place to prevent future bloat.

---

**Note:** The cleanup script ran successfully and deleted 56 old Docker images. The actual size reduction will be visible in the Artifact Registry within a few minutes after the deletion operations complete.
