#!/bin/bash
set -e

# ==============================================================================
# Banana Studio - Cloud Run Deployment Script
# ==============================================================================

# Configuration with defaults
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"jwlee-argolis-202104"}
REGION=${GOOGLE_CLOUD_LOCATION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"banana-studio"}

echo "🚀 Deploying Banana Studio to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
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

echo "⚠️ Note: Banana Studio currently uses local file storage (data/quotas.json)."
echo "   Since Cloud Run is stateless, quotas and student records will reset"
echo "   whenever the container instance is restarted or scaled."
echo "   (For permanent data, migrate to Firestore or Cloud SQL later)."
echo "------------------------------------------------------"

echo "🚢 Building and deploying..."
# Use Cloud Build to build the container from the Dockerfile and deploy it
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION"

echo "✅ Deployment complete!"