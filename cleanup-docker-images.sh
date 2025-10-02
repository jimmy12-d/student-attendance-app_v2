#!/bin/bash

# Script to clean up old Docker images from Artifact Registry
# This will keep only the 5 most recent images per function

PROJECT_ID=$(gcloud config get-value project)
LOCATION="asia-southeast1"
REPOSITORY="gcf-artifacts"

echo "🧹 Cleaning up Docker images in ${REPOSITORY}..."
echo "Project: ${PROJECT_ID}"
echo "Location: ${LOCATION}"
echo ""

# Get list of all unique image packages (function names)
echo "📋 Finding all Cloud Functions..."
PACKAGES=$(gcloud artifacts docker images list \
  ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY} \
  --format="value(package)" \
  --include-tags | sort -u | grep -v "/cache$")

echo "Found $(echo "$PACKAGES" | wc -l | tr -d ' ') unique functions"
echo ""

# For each package, keep only the 5 most recent versions and delete the rest
for PACKAGE in $PACKAGES; do
  echo "🔍 Processing: $(basename $PACKAGE)"
  
  # Get all versions sorted by creation time (oldest first)
  VERSIONS=$(gcloud artifacts docker images list ${PACKAGE} \
    --format="value(version)" \
    --sort-by=~CREATE_TIME \
    --limit=1000)
  
  VERSION_COUNT=$(echo "$VERSIONS" | wc -l | tr -d ' ')
  
  if [ $VERSION_COUNT -gt 5 ]; then
    DELETE_COUNT=$((VERSION_COUNT - 5))
    echo "  Found ${VERSION_COUNT} versions, will delete ${DELETE_COUNT} old versions"
    
    # Delete all but the 5 most recent versions
    echo "$VERSIONS" | tail -n +6 | while read VERSION; do
      if [ ! -z "$VERSION" ]; then
        IMAGE_PATH="${PACKAGE}@${VERSION}"
        echo "  🗑️  Deleting: ${VERSION}"
        gcloud artifacts docker images delete ${IMAGE_PATH} --quiet --delete-tags
      fi
    done
  else
    echo "  ✅ Only ${VERSION_COUNT} versions, keeping all"
  fi
  echo ""
done

# Clean up cache images older than 7 days
echo "🗑️  Cleaning up cache images older than 7 days..."
CACHE_IMAGES=$(gcloud artifacts docker images list \
  ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY} \
  --format="value(package,version)" \
  --include-tags \
  --filter="createTime<'-P7D'" | grep "/cache")

if [ ! -z "$CACHE_IMAGES" ]; then
  echo "$CACHE_IMAGES" | while read PACKAGE VERSION; do
    IMAGE_PATH="${PACKAGE}@${VERSION}"
    echo "  🗑️  Deleting cache: ${PACKAGE}"
    gcloud artifacts docker images delete ${IMAGE_PATH} --quiet --delete-tags 2>/dev/null || true
  done
else
  echo "  ✅ No old cache images found"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Checking repository size..."
gcloud artifacts repositories describe ${REPOSITORY} \
  --location=${LOCATION} \
  --format="table(name,sizeBytes.size(units_out=G,precision=2))"
