# Quick Reference: Docker Image Management

## 🚨 Problem Solved
Your Docker repositories were 31.9 GB → Now reducing to ~6-9 GB (saving ~$2.40/month)

## ✅ What Was Done

### 1. Automatic Cleanup Policies (ACTIVE)
- **gcf-artifacts**: Keeps only 5 recent versions per function
- **cloud-run-source-deploy**: Keeps only 3 recent versions
- Policies run automatically on future deployments

### 2. Manual Cleanup (COMPLETED)
- Deleted 56 old Docker images
- Freed up ~22-23 GB of storage

## 📋 Quick Commands

### Check repository sizes:
```bash
gcloud artifacts repositories list --location=asia-southeast1
```

### Run manual cleanup again (if needed):
```bash
./cleanup-docker-images.sh
```

### Preview cleanup (dry run):
```bash
./dry-run-cleanup.sh
```

### View lifecycle policies:
```bash
# For Cloud Functions
gcloud artifacts repositories describe gcf-artifacts \
  --location=asia-southeast1 \
  --format="yaml(cleanupPolicies)"

# For Cloud Run
gcloud artifacts repositories describe cloud-run-source-deploy \
  --location=asia-southeast1 \
  --format="yaml(cleanupPolicies)"
```

## 🎯 Best Practices Going Forward

### 1. Deploy Only What Changed
```bash
# Instead of deploying all functions
firebase deploy --only functions:specificFunctionName
```

### 2. Monitor Monthly
Check sizes on the 1st of each month:
```bash
gcloud artifacts repositories list --location=asia-southeast1
```

### 3. Optimize Dependencies (Optional)
Review `functions/package.json` and remove:
- `@tensorflow/tfjs` (if not needed - you use external Python service)
- Other unused packages

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Storage | 31.9 GB | ~6-9 GB | 72% reduction |
| Cost/month | $3.20 | $0.80 | $2.40 savings |
| Images kept | 100+ | 5-10 per function | Optimized |

## 🔄 How It Works Now

1. You deploy a Cloud Function
2. Google creates a new Docker image
3. Lifecycle policy automatically deletes old versions
4. Only 5 most recent versions are kept
5. Untagged images deleted after 30 days

## 📁 Reference Files

- `DOCKER-CLEANUP-GUIDE.md` - Complete documentation
- `DOCKER-CLEANUP-SUMMARY.md` - Execution summary
- `cleanup-docker-images.sh` - Manual cleanup script
- `dry-run-cleanup.sh` - Preview cleanup script
- `gcf-artifacts-lifecycle-policy.json` - Cloud Functions policy
- `cloud-run-lifecycle-policy.json` - Cloud Run policy

## ⚠️ Important Notes

1. **Policies are permanent** - They will keep running automatically
2. **Safe rollback** - You can still rollback to any of the 5 recent versions
3. **No action needed** - Everything is now automated
4. **Cost savings** - ~$29/year in storage costs saved

## 🆘 Troubleshooting

### If size increases again:
```bash
# Run manual cleanup
./cleanup-docker-images.sh

# Check which functions are largest
gcloud artifacts docker images list \
  asia-southeast1-docker.pkg.dev/$(gcloud config get-value project)/gcf-artifacts \
  --format="table(package,version,createTime)" | head -20
```

### If you need more versions kept:
Edit the policy files and increase `keepCount` from 5 to desired number, then reapply:
```bash
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --location=asia-southeast1 \
  --policy=gcf-artifacts-lifecycle-policy.json
```

---

## ✨ Status: All Set!

Your Docker images are now automatically managed and will not grow out of control again.
