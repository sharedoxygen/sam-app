#!/bin/bash

JENKINS_URL="${JENKINS_URL:-http://localhost:9080}"
JENKINS_USER="${JENKINS_USER:-admin}"
JENKINS_PASS="${JENKINS_PASS:-changeme}"

echo "🔍 Jenkins Pipeline Status Check"
echo "==============================="
echo ""

# Function to check job status
check_job_status() {
    local job_name=$1
    local branch=$2
    
    echo "📋 Checking: $job_name ($branch branch)"
    
    # Get last build number
    last_build=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/job/$job_name/api/json" | grep -o '"lastBuild":{"number":[0-9]*' | grep -o '[0-9]*')
    
    if [ -z "$last_build" ]; then
        echo "   ❌ No builds found"
        echo ""
        return
    fi
    
    # Get build status
    build_status=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/job/$job_name/$last_build/api/json" | grep -o '"result":"[^"]*' | cut -d'"' -f4)
    build_url="$JENKINS_URL/job/$job_name/$last_build/"
    
    case "$build_status" in
        "SUCCESS")
            echo "   ✅ Build #$last_build: SUCCESS"
            ;;
        "FAILURE")
            echo "   ❌ Build #$last_build: FAILURE"
            ;;
        "UNSTABLE")
            echo "   ⚠️  Build #$last_build: UNSTABLE"
            ;;
        "")
            echo "   🔄 Build #$last_build: RUNNING"
            ;;
        *)
            echo "   ❓ Build #$last_build: $build_status"
            ;;
    esac
    
    echo "   🔗 View: $build_url"
    echo ""
}

# Check all pipeline jobs
check_job_status "agent-activity-manager" "in-progress"
check_job_status "agent-activity-manager-development" "development" 
check_job_status "agent-activity-manager-publish" "publish"
check_job_status "agent-activity-manager-main" "main"

echo "💡 To manually trigger builds:"
echo "   1. Go to Jenkins UI: $JENKINS_URL"
echo "   2. Click on a job name"
echo "   3. Click 'Build Now' button"
echo ""
echo "🎯 After configuring GitHub credentials manually:"
echo "   1. Add credentials: Manage Jenkins → Manage Credentials"
echo "   2. Update each job: Configure → Pipeline → Credentials → Select 'github-pat'"
echo "   3. Manual trigger: Click 'Build Now' in Jenkins UI" 