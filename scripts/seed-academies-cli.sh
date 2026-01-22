#!/bin/bash

# Script to seed academies using Firebase CLI
# This requires Firebase CLI to be installed and authenticated

echo "🌱 Starting to seed academies to Firebase..."
echo "📦 Collection: academies_2026_spring"
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  You need to login to Firebase first."
    echo "   Run: firebase login"
    exit 1
fi

# Set the project
firebase use iyf-orlando-academy

# Academy data - we'll create JSON files and upload them
ACADEMIES=(
  '{"name":"Art","price":100,"schedule":"9:30 AM - 11:30 AM","hasLevels":false,"order":1,"enabled":true,"description":"Art Academy"}'
  '{"name":"English","price":50,"schedule":"10:00 AM - 11:30 AM","hasLevels":false,"order":2,"enabled":true,"description":"English Academy"}'
  '{"name":"Kids Academy","price":50,"schedule":"10:30 AM - 12:15 PM","hasLevels":false,"order":3,"enabled":true,"description":"Kids Academy"}'
  '{"name":"Korean Language","price":50,"schedule":"10:00 AM - 11:30 AM","hasLevels":true,"levels":[{"name":"Alphabet","schedule":"9:00 AM - 10:15 AM","order":1},{"name":"Beginner","schedule":"10:20 AM - 11:35 AM","order":2},{"name":"Intermediate","schedule":"10:00 AM - 11:30 AM","order":3},{"name":"K-Movie Conversation","schedule":"10:00 AM - 11:30 AM","order":4}],"order":4,"enabled":true,"description":"Korean Language Academy"}'
  '{"name":"Piano","price":100,"schedule":"10:00 AM - 11:30 AM","hasLevels":false,"order":5,"enabled":true,"description":"Piano Academy"}'
  '{"name":"Pickleball","price":50,"schedule":"7:15 AM - 9:15 AM","hasLevels":false,"order":6,"enabled":true,"description":"Pickleball Academy"}'
  '{"name":"Soccer","price":50,"schedule":"9:00 AM - 10:30 AM","hasLevels":false,"order":7,"enabled":true,"description":"Soccer Academy"}'
  '{"name":"Taekwondo","price":100,"schedule":"9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM","hasLevels":false,"order":8,"enabled":true,"description":"Taekwondo Academy"}'
)

created=0
updated=0

for academy_json in "${ACADEMIES[@]}"; do
  # Extract name from JSON
  name=$(echo "$academy_json" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  doc_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
  
  # Create temp file
  temp_file=$(mktemp)
  echo "$academy_json" > "$temp_file"
  
  # Try to set the document
  if firebase firestore:set "academies_2026_spring/$doc_id" "$temp_file" --yes 2>/dev/null; then
    echo "   ✅ Created/Updated: $name"
    ((created++))
  else
    echo "   ❌ Error creating: $name"
  fi
  
  # Clean up
  rm "$temp_file"
done

echo ""
echo "✅ Seeding completed!"
echo "   Created/Updated: $created academies"
echo "   Total: ${#ACADEMIES[@]} academies"
echo ""
