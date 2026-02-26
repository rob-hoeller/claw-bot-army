#!/bin/bash

# Phase 3 Pipeline End-to-End Test Suite
# Tests 4 features through the complete pipeline
# Usage: ./scripts/test-pipeline-e2e.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
TIMEOUT=60  # seconds
POLL_INTERVAL=2  # seconds

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local${NC}"
  exit 1
fi

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC} $1"
  ((PASSED_TESTS++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC} $1"
  ((FAILED_TESTS++))
}

log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

# Create a feature
create_feature() {
  local title="$1"
  local priority="${2:-medium}"
  
  local response=$(curl -s -X POST "${BASE_URL}/api/features" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${title}\",\"priority\":\"${priority}\"}")
  
  echo "$response" | jq -r '.feature.id // empty'
}

# Submit a feature
submit_feature() {
  local feature_id="$1"
  
  curl -s -X POST "${BASE_URL}/api/features/${feature_id}/submit" \
    -H "Content-Type: application/json" \
    -d '{}' > /dev/null
}

# Get feature status
get_feature_status() {
  local feature_id="$1"
  
  curl -s "${BASE_URL}/api/features/${feature_id}/status" | jq -r '.feature // empty'
}

# Approve at gate
approve_feature() {
  local feature_id="$1"
  
  curl -s -X POST "${BASE_URL}/api/features/${feature_id}/review-verdict" \
    -H "Content-Type: application/json" \
    -d '{"verdict":"approve"}' > /dev/null
}

# Wait for condition with timeout
wait_for_condition() {
  local feature_id="$1"
  local condition="$2"  # e.g., ".needs_attention == true" or ".status == \"done\""
  local timeout="$3"
  
  local elapsed=0
  while [ $elapsed -lt $timeout ]; do
    local feature=$(get_feature_status "$feature_id")
    local result=$(echo "$feature" | jq "$condition")
    
    if [ "$result" = "true" ]; then
      return 0
    fi
    
    sleep $POLL_INTERVAL
    ((elapsed+=POLL_INTERVAL))
  done
  
  return 1
}

# Get agent activity count for a feature
get_activity_count() {
  local feature_id="$1"
  
  curl -s "${BASE_URL}/api/agent-activity/${feature_id}" | jq -r '.activities | length // 0'
}

# Verify activity events exist for all 6 steps
verify_activity_events() {
  local feature_id="$1"
  
  local activities=$(curl -s "${BASE_URL}/api/agent-activity/${feature_id}" | jq -r '.activities // []')
  
  # Check for events from all 6 steps
  local steps=("intake" "spec" "design" "build" "qa" "ship")
  local all_found=true
  
  for step in "${steps[@]}"; do
    local count=$(echo "$activities" | jq "[.[] | select(.step_id == \"$step\")] | length")
    if [ "$count" -eq 0 ]; then
      log_fail "No activity events found for step: $step"
      all_found=false
    fi
  done
  
  if [ "$all_found" = true ]; then
    return 0
  else
    return 1
  fi
}

# Run a single test
run_test() {
  local test_num="$1"
  local title="$2"
  local priority="$3"
  local description="$4"
  
  ((TOTAL_TESTS++))
  
  log_test "Test ${test_num}: ${title}"
  log_info "Priority: ${priority}, Complexity: ${description}"
  
  # Step 1: Create feature
  log_info "Creating feature..."
  local feature_id=$(create_feature "$title" "$priority")
  
  if [ -z "$feature_id" ]; then
    log_fail "Test ${test_num}: Failed to create feature"
    return 1
  fi
  
  log_info "Feature created: ${feature_id}"
  
  # Step 2: Submit feature
  log_info "Submitting feature to start pipeline..."
  submit_feature "$feature_id"
  
  # Step 3: Wait for intake + spec to complete (first human gate)
  log_info "Waiting for spec gate (max ${TIMEOUT}s)..."
  if ! wait_for_condition "$feature_id" '.needs_attention == true and .current_step == "spec"' $TIMEOUT; then
    log_fail "Test ${test_num}: Timeout waiting for spec gate"
    return 1
  fi
  
  log_info "Reached spec gate. Approving..."
  
  # Step 4: Approve spec
  approve_feature "$feature_id"
  
  # Step 5: Wait for design + build + qa to complete (ship gate or done)
  log_info "Waiting for ship gate or completion (max ${TIMEOUT}s)..."
  if ! wait_for_condition "$feature_id" '.needs_attention == true and .current_step == "ship"' $TIMEOUT; then
    # Check if it's already done (some tests might auto-complete)
    local status=$(get_feature_status "$feature_id" | jq -r '.status')
    if [ "$status" != "done" ]; then
      log_fail "Test ${test_num}: Timeout waiting for ship gate"
      return 1
    fi
  fi
  
  local current_step=$(get_feature_status "$feature_id" | jq -r '.current_step')
  
  if [ "$current_step" = "ship" ]; then
    log_info "Reached ship gate. Approving final..."
    
    # Step 6: Approve final
    approve_feature "$feature_id"
    
    # Wait a moment for status to update
    sleep 2
  fi
  
  # Step 7: Verify status is 'done' or 'pr_submitted'
  local final_status=$(get_feature_status "$feature_id" | jq -r '.status')
  if [ "$final_status" != "done" ] && [ "$final_status" != "pr_submitted" ]; then
    log_fail "Test ${test_num}: Expected status 'done' or 'pr_submitted', got '${final_status}'"
    return 1
  fi
  
  # Step 8: Verify agent activity exists for all steps
  log_info "Verifying agent activity events..."
  if ! verify_activity_events "$feature_id"; then
    log_fail "Test ${test_num}: Missing activity events for some steps"
    return 1
  fi
  
  # Step 9: Success!
  log_pass "Test ${test_num}: ${title}"
  log_info "Final status: ${final_status}"
  log_info "Activity events: $(get_activity_count "$feature_id")"
  echo ""
  
  return 0
}

# Main test suite
echo ""
echo "======================================"
echo "  Pipeline E2E Test Suite"
echo "======================================"
echo ""
echo "Testing against: ${BASE_URL}"
echo ""

# Test 1: Small - simple UI fix
run_test 1 \
  "Add loading spinner to Settings page" \
  "low" \
  "Small - simple UI fix"

# Test 2: Medium - new component
run_test 2 \
  "Create NotificationBell component" \
  "medium" \
  "Medium - new component"

# Test 3: Medium - API + UI
run_test 3 \
  "Add dark mode toggle with persistence" \
  "medium" \
  "Medium - API + UI"

# Test 4: Large - complex feature
run_test 4 \
  "Build agent performance metrics chart" \
  "high" \
  "Large - complex feature"

# Summary
echo ""
echo "======================================"
echo "  Test Summary"
echo "======================================"
echo ""
echo "Total tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo ""
  exit 1
fi
