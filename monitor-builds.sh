#!/bin/bash

JENKINS_URL="${JENKINS_URL:-http://localhost:9080}"
JENKINS_USER="${JENKINS_USER:-admin}"
JENKINS_PASS="${JENKINS_PASS:-changeme}"

echo "🔍 Real-time Jenkins Build Monitor"
echo "=================================="
echo "Watching for build activity... (Press Ctrl+C to stop)"
echo ""

monitor_job() {
    local job_name=$1
    local branch=$2
    
    # Get current build number
    current_build=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/job/$job_name/api/json" | grep -o '"lastBuild":{"_class":"[^"]*","number":[0-9]*' | grep -o '[0-9]*')
    
    if [ -n "$current_build" ]; then
        # Check if build is running
        is_building=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/job/$job_name/$current_build/api/json" | grep -o '"building":[^,]*' | cut -d':' -f2)
        
        if [ "$is_building" = "true" ]; then
            echo "🔄 $job_name #$current_build: RUNNING ($branch)"
        else
            # Get build result
            result=$(curl -s -u $JENKINS_USER:$JENKINS_PASS "$JENKINS_URL/job/$job_name/$current_build/api/json" | grep -o '"result":"[^"]*' | cut -d'"' -f4)
            case "$result" in
                "SUCCESS") echo "✅ $job_name #$current_build: SUCCESS ($branch)" ;;
                "FAILURE") echo "❌ $job_name #$current_build: FAILURE ($branch)" ;;
                "UNSTABLE") echo "⚠️  $job_name #$current_build: UNSTABLE ($branch)" ;;
                *) echo "❓ $job_name #$current_build: $result ($branch)" ;;
            esac
        fi
    else
        echo "⏳ $job_name: No builds yet ($branch)"
    fi
}

# Monitor loop
while true; do
    clear
    echo "🔍 Real-time Jenkins Build Monitor - $(date)"
    echo "=============================================="
    echo ""
    
    monitor_job "agent-activity-manager" "in-progress"
    monitor_job "agent-activity-manager-development" "development"
    monitor_job "agent-activity-manager-publish" "publish"
    monitor_job "agent-activity-manager-main" "main"
    
    echo ""
    echo "💡 Trigger builds manually in Jenkins UI: $JENKINS_URL"
    echo "🔄 Refreshing in 5 seconds... (Ctrl+C to stop)"
    
    sleep 5
done 