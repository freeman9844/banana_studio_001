#!/bin/bash
set -e

# ==============================================================================
# Banana Studio - Cloud Run Deployment Script
# ==============================================================================

# Configuration with defaults
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"jwlee-argolis-202104"}
REGION=${GOOGLE_CLOUD_LOCATION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"banana-studio"}
BUCKET_NAME="${PROJECT_ID}-banana-studio-data"

echo "🚀 Deploying Banana Studio to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Bucket: $BUCKET_NAME"
echo "------------------------------------------------------"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Ensure correct project is set
gcloud config set project "$PROJECT_ID"

echo "📦 Enabling required APIs (Cloud Run, Cloud Build, Artifact Registry)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project="$PROJECT_ID"

echo "🪣 Setting up GCS bucket for persistent storage..."
if ! gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
    gsutil mb -l "$REGION" -p "$PROJECT_ID" "gs://$BUCKET_NAME"
    echo "✅ Bucket created: gs://$BUCKET_NAME"
else
    echo "✅ Bucket already exists: gs://$BUCKET_NAME"
fi
echo "------------------------------------------------------"

echo "🚢 Building and deploying..."
# Use Cloud Build to build the container from the Dockerfile and deploy it
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET_NAME=$BUCKET_NAME"

echo "✅ Deployment complete!"