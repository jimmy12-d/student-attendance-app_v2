#!/bin/bash

# Dry-run script to show what will be deleted without actually deleting

PROJECT_ID=$(gcloud config get-value project)
LOCATION="asia-southeast1"
REPOSITORY="gcf-artifacts"

echo "🔍 DRY RUN - Analyzing Docker images in ${REPOSITORY}..."
echo "Project: ${PROJECT_ID}"
echo "Location: ${LOCATION}"
echo "This will NOT delete anything, just show what would be deleted."
echo ""

# Get list of all unique image packages (function names)
echo "📋 Finding all Cloud Functions..."
PACKAGES=$(gcloud artifacts docker images list \
  ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY} \
  --format="value(package)" \
  --include-tags | sort -u | grep -v "/cache$")

TOTAL_TO_DELETE=0

echo "Found $(echo "$PACKAGES" | wc -l | tr -d ' ') unique functions"
echo ""

# For each package, show what would be deleted
for PACKAGE in $PACKAGES; do
  FUNCTION_NAME=$(basename $PACKAGE)
  echo "🔍 Analyzing: ${FUNCTION_NAME}"
  
  # Get all versions sorted by creation time (newest first)
  VERSIONS=$(gcloud artifacts docker images list ${PACKAGE} \
    --format="csv[no-heading](version,createTime)" \
    --sort-by=~CREATE_TIME \
    --limit=1000)
  
  VERSION_COUNT=$(echo "$VERSIONS" | wc -l | tr -d ' ')
  
  if [ $VERSION_COUNT -gt 5 ]; then
    DELETE_COUNT=$((VERSION_COUNT - 5))
    TOTAL_TO_DELETE=$((TOTAL_TO_DELETE + DELETE_COUNT))
    echo "  📦 Total versions: ${VERSION_COUNT}"
    echo "  ✅ Keeping: 5 most recent"
    echo "  🗑️  Would delete: ${DELETE_COUNT} old versions"
    
    # Show which versions would be kept (5 newest)
    echo "  📌 Versions to KEEP:"
    echo "$VERSIONS" | head -5 | while IFS=',' read VERSION CREATE_TIME; do
      echo "     ✅ ${CREATE_TIME} - $(echo ${VERSION} | cut -c-20)..."
    done
    
    # Show which versions would be deleted
    echo "  🗑️  Versions to DELETE:"
    echo "$VERSIONS" | tail -n +6 | while IFS=',' read VERSION CREATE_TIME; do
      echo "     ❌ ${CREATE_TIME} - $(echo ${VERSION} | cut -c-20)..."
    done
  else
    echo "  ✅ Only ${VERSION_COUNT} versions, keeping all"
  fi
  echo ""
done

# Analyze cache images
echo "🗑️  Analyzing cache images older than 7 days..."
CACHE_COUNT=$(gcloud artifacts docker images list \
  ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY} \
  --format="value(package)" \
  --include-tags \
  --filter="createTime<'-P7D'" | grep "/cache" | wc -l | tr -d ' ')

if [ $CACHE_COUNT -gt 0 ]; then
  echo "  🗑️  Would delete: ${CACHE_COUNT} old cache images"
  TOTAL_TO_DELETE=$((TOTAL_TO_DELETE + CACHE_COUNT))
else
  echo "  ✅ No old cache images found"
fi

echo ""
echo "📊 SUMMARY"
echo "========================================="
echo "Total images that would be deleted: ${TOTAL_TO_DELETE}"
echo "Current repository size: ~29 GB"
echo "Expected size after cleanup: ~5-8 GB"
echo "Expected space savings: ~21-24 GB"
echo ""
echo "To proceed with actual cleanup, run:"
echo "  ./cleanup-docker-images.sh"
