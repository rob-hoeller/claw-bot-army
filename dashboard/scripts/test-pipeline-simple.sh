#!/bin/bash
# Simplified pipeline test

set -e

BASE_URL="http://localhost:3000"

echo "=== Testing Pipeline E2E ==="
echo ""

# Helper: poll for a condition
poll_until() {
  local feature_id=$1
  local condition=$2
  local timeout=$3
  local elapsed=0
  
  while [ $elapsed -lt $timeout ]; do
    local result=$(curl -s "${BASE_URL}/api/features/${feature_id}/status" | jq -r ".feature | $condition")
    if [ "$result" = "true" ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  
  echo "ERROR: Timeout waiting for condition: $condition"
  return 1
}

# Test 1: Create and submit a feature
echo "Step 1: Creating feature..."
FEATURE_ID=$(curl -s -X POST "${BASE_URL}/api/features" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Feature - Simple","priority":"medium"}' | jq -r '.feature.id')

echo "Feature ID: $FEATURE_ID"

# Submit
echo "Step 2: Submitting feature..."
curl -s -X POST "${BASE_URL}/api/features/${FEATURE_ID}/submit" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null

# Wait for spec gate
echo "Step 3: Waiting for spec gate (needs_attention = true)..."
poll_until "$FEATURE_ID" '.needs_attention == true and .current_step == "spec"' 60

# Check status
echo "Step 4: At spec gate. Checking status..."
curl -s "${BASE_URL}/api/features/${FEATURE_ID}/status" | jq '{
  current_step: .feature.current_step,
  needs_attention: .feature.needs_attention,
  status: .feature.status
}'

# Check activity count
ACTIVITY_COUNT=$(curl -s "${BASE_URL}/api/agent-activity/${FEATURE_ID}" | jq '.activities | length')
echo "Activity events so far: $ACTIVITY_COUNT"

# Approve spec
echo "Step 5: Approving spec..."
curl -s -X POST "${BASE_URL}/api/features/${FEATURE_ID}/review-verdict" \
  -H "Content-Type: application/json" \
  -d '{"verdict":"approve"}' > /dev/null

# Wait for ship gate
echo "Step 6: Waiting for ship gate (needs_attention = true)..."
poll_until "$FEATURE_ID" '.needs_attention == true and .current_step == "ship"' 60

# Check final status
echo "Step 7: At ship gate. Checking status..."
curl -s "${BASE_URL}/api/features/${FEATURE_ID}/status" | jq '{
  current_step: .feature.current_step,
  needs_attention: .feature.needs_attention,
  status: .feature.status
}'

# Check final activity count
FINAL_ACTIVITY=$(curl -s "${BASE_URL}/api/agent-activity/${FEATURE_ID}" | jq '.activities | length')
echo "Final activity events: $FINAL_ACTIVITY"

# Verify all 6 steps have activity
echo "Step 8: Verifying activity for all 6 steps..."
STEPS=$(curl -s "${BASE_URL}/api/agent-activity/${FEATURE_ID}" | jq -r '[.activities[] | .step_id] | unique | sort | join(", ")')
echo "Steps with activity: $STEPS"

# Check if all 6 steps are present
EXPECTED="build, design, intake, qa, ship, spec"
if [ "$STEPS" = "$EXPECTED" ]; then
  echo "✓ All 6 steps have activity events"
else
  echo "✗ Missing steps. Expected: $EXPECTED, Got: $STEPS"
  exit 1
fi

echo ""
echo "✓ Test complete - ALL CHECKS PASSED"
