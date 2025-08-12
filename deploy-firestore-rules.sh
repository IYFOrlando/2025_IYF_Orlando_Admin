#!/bin/bash

# Deploy Firestore security rules
echo "🔥 Deploying Firestore security rules..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Deploy the rules
firebase deploy --only firestore:rules

echo "✅ Firestore rules deployed successfully!"
echo ""
echo "📋 Rules summary:"
echo "- Admins (orlando@iyfusa.org, jodlouis.dev@gmail.com, michellemoralespradis@gmail.com): Full access"
echo "- Gmail users: Read-only access to registrations, invoices, and pricing"
echo "- Others: No access"
