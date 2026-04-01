#!/bin/bash
set -e

echo "🚀 INTELLIMIX AUTO-DEPLOYMENT"
echo "=============================="
echo ""
echo "This script will attempt to deploy your app to Google Cloud Run"
echo "without requiring manual browser steps."
echo ""

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
echo "Google Cloud Project: $PROJECT_ID"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: Not in the intellimix directory"
    echo "Please run from: /Users/admin/Documents/AIAIAI/Intellimix\ Production\ ready/intellimix"
    exit 1
fi

echo "✅ Correct directory"
echo ""

# Method 1: Try direct deployment from GitHub
echo "🔄 Attempting Method 1: Deploy from GitHub repository..."
echo ""

if gcloud run deploy intellimix \
  --source=https://github.com/heattafrica-byte/intellimix-production.git \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars=NODE_ENV=production 2>&1 | tee deploy.log; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo ""
    SERVICE_URL=$(gcloud run services describe intellimix --region=us-central1 --format='value(status.url)')
    echo "🎉 Your app is LIVE at:"
    echo "$SERVICE_URL"
    exit 0
fi

echo ""
echo "Method 1 encountered an issue. Trying Method 2..."
echo ""

# Method 2: Build locally and push to registry
echo "🔄 Attempting Method 2: Build and push container..."
echo ""

# Check if gcloud can build
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not available"
    exit 1
fi

# Try to use gcloud to build
echo "Building with Cloud Build..."

if gcloud builds submit \
  --config=cloudbuild.yaml \
  --region=us-central1 2>&1 | tee build.log; then
    echo ""
    echo "✅ BUILD SUBMITTED!"
    echo ""
    echo "Watch your build progress at:"
    echo "https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo ""
    echo "Once complete, your service will be available at:"
    echo "https://console.cloud.google.com/run?project=$PROJECT_ID"
    exit 0
fi

echo ""
echo "❌ Both deployment methods encountered issues."
echo ""
echo "This is likely due to authentication. Here's what to do:"
echo ""
echo "1. Authenticate with gcloud:"
echo "   gcloud auth login"
echo ""
echo "2. Or, complete the browser step:"
echo "   https://console.cloud.google.com/cloud-build/repositories"
echo ""
echo "3. Then your app will deploy automatically"
echo ""
