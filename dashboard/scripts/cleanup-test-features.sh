#!/bin/bash
set -e

# cleanup-test-features.sh
# Deletes all test features and their activity events from Supabase

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source .env.local
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
else
  echo "❌ Error: .env.local not found at $PROJECT_ROOT/.env.local"
  exit 1
fi

# Check required env vars
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials in .env.local"
  exit 1
fi

echo "🧹 Cleaning up test features..."
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Fetch test feature IDs
echo "📋 Finding test features (titles starting with 'Test ')..."
RESPONSE=$(curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_test_features" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' || echo '[]')

# If RPC doesn't exist, use direct query
FEATURES=$(curl -s -G "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/features" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --data-urlencode "select=id,title" \
  --data-urlencode "title=ilike.Test *" || echo '[]')

FEATURE_COUNT=$(echo "$FEATURES" | jq '. | length')

if [ "$FEATURE_COUNT" -eq 0 ]; then
  echo "✅ No test features found. Database is clean."
  exit 0
fi

echo "Found $FEATURE_COUNT test features"
echo ""

# Extract feature IDs
FEATURE_IDS=$(echo "$FEATURES" | jq -r '.[].id' | tr '\n' ',' | sed 's/,$//')

if [ -z "$FEATURE_IDS" ]; then
  echo "✅ No test features to delete."
  exit 0
fi

echo "🗑️  Deleting agent activity events..."
ACTIVITY_DELETE=$(curl -s -X DELETE "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_activity" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data-urlencode "feature_id=in.($FEATURE_IDS)")

ACTIVITY_COUNT=$(echo "$ACTIVITY_DELETE" | jq '. | length' || echo "0")
echo "   Deleted $ACTIVITY_COUNT activity events"

echo "🗑️  Deleting test features..."
FEATURES_DELETE=$(curl -s -X DELETE "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/features" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data-urlencode "id=in.($FEATURE_IDS)")

echo "   Deleted $FEATURE_COUNT features"
echo ""
echo "✅ Cleanup complete!"
echo "   - Deleted $FEATURE_COUNT features"
echo "   - Deleted $ACTIVITY_COUNT activity events"
