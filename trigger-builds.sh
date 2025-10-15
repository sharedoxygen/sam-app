#!/bin/bash

# 🚀 MODERN JENKINS CI/CD TRIGGER SYSTEM
# Professional build automation with real-time monitoring and elegant UI

JENKINS_URL="${JENKINS_URL:-http://localhost:9080}"
JENKINS_USER="${JENKINS_USER:-admin}"
JENKINS_PASSWORD="${JENKINS_PASSWORD:-changeme}"

# Modern color palette
COLORS_RESET='\033[0m'
COLORS_BOLD='\033[1m'
COLORS_DIM='\033[2m'
COLORS_PRIMARY='\033[38;5;24m'
COLORS_SUCCESS='\033[38;5;22m'
COLORS_ERROR='\033[38;5;124m'
COLORS_WARNING='\033[38;5;130m'
COLORS_INFO='\033[38;5;31m'
COLORS_ACCENT='\033[38;5;61m'
COLORS_MUTED='\033[38;5;240m'
COLORS_BG_DARK='\033[48;5;234m'
COLORS_BG_SUCCESS='\033[48;5;22m'
COLORS_BG_ERROR='\033[48;5;52m'
COLORS_HEADER_BG='\033[48;5;17m'
COLORS_BORDER='\033[38;5;24m'
COLORS_TEXT_BRIGHT='\033[38;5;15m'

# Professional symbols
ICON_ROCKET="🚀"
ICON_GEAR="⚙️"
ICON_CHECK="✅"
ICON_CROSS="❌"
ICON_BUILDING="🔨"
ICON_MONITOR="📊"
ICON_CLOCK="⏱️"
ICON_STAR="⭐"
ICON_DEPLOY="🌟"
ICON_BRANCH="🌿"
ICON_SPINNER="◐◓◑◒"

# Header with modern design
show_header() {
    clear
    echo -e "${COLORS_HEADER_BG}${COLORS_TEXT_BRIGHT}${COLORS_BOLD}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                            Sales Activity Manager                            ║"
    echo "║                    ${ICON_ROCKET} Jenkins CI/CD AUTOMATION SYSTEM ${ICON_ROCKET}                 ║"
    echo "║                           Professional Build Management                      ║"
    echo "║                         developed by:  Shared Oxygen, LLC                    ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${COLORS_RESET}"
    echo -e "${COLORS_PRIMARY}${COLORS_BOLD}Agent Activity Manager${COLORS_RESET} ${COLORS_MUTED}• Version 2.0 • $(date '+%Y-%m-%d %H:%M:%S')${COLORS_RESET}\n"
}

# Check git status and warn about unpushed changes
check_git_sync() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [[ -z "$current_branch" ]]; then
        echo -e "${COLORS_WARNING}⚠️  Not in a git repository${COLORS_RESET}"
        return
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${COLORS_ERROR}⚠️  ${COLORS_BOLD}CI/CD WARNING${COLORS_RESET}"
        echo -e "${COLORS_WARNING}   You have uncommitted local changes!${COLORS_RESET}"
        echo -e "${COLORS_INFO}   Jenkins builds from GitHub, not local changes.${COLORS_RESET}"
        echo -e "${COLORS_MUTED}   Commit changes first: git add . && git commit -m \"message\"${COLORS_RESET}\n"
        return 1
    fi
    
    # Check if branch exists on remote
    if ! git ls-remote --exit-code --heads origin "$current_branch" >/dev/null 2>&1; then
        echo -e "${COLORS_WARNING}⚠️  Branch '$current_branch' doesn't exist on GitHub${COLORS_RESET}"
        echo -e "${COLORS_INFO}   Push branch first: git push origin $current_branch${COLORS_RESET}\n"
        return 1
    fi
    
    # Check if local is ahead of remote
    local ahead=$(git rev-list --count origin/"$current_branch"..HEAD 2>/dev/null || echo "0")
    if [[ "$ahead" -gt 0 ]]; then
        echo -e "${COLORS_ERROR}⚠️  ${COLORS_BOLD}CI/CD SYNC WARNING${COLORS_RESET}"
        echo -e "${COLORS_WARNING}   You have $ahead unpushed commit(s) on '$current_branch'${COLORS_RESET}"
        echo -e "${COLORS_INFO}   Jenkins will build from GitHub, not your latest changes!${COLORS_RESET}"
        echo -e "${COLORS_PRIMARY}   Push changes first: git push origin $current_branch${COLORS_RESET}\n"
        return 1
    fi
    
    echo -e "${COLORS_SUCCESS}✅ Git sync verified - Jenkins will build latest GitHub code${COLORS_RESET}\n"
    return 0
}

# Enhanced progress bar with percentage and ETA
show_progress_bar() {
    local current=$1
    local total=$2
    local message="$3"
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    printf "\r${COLORS_INFO}${message}${COLORS_RESET} "
    printf "${COLORS_BG_DARK}${COLORS_SUCCESS}"
    printf "%*s" $filled | tr ' ' '█'
    printf "${COLORS_MUTED}"
    printf "%*s" $empty | tr ' ' '░'
    printf "${COLORS_RESET} ${COLORS_BOLD}%3d%%${COLORS_RESET}" $percentage
    
    if [[ $percentage -lt 100 ]]; then
        local eta=$(( (total - current) * 1 ))
        printf " ${COLORS_MUTED}(ETA: ${eta}s)${COLORS_RESET}"
    else
        printf " ${COLORS_SUCCESS}${ICON_CHECK} Complete${COLORS_RESET}"
    fi
}

# Animated loading with professional spinner
show_loading() {
    local message="$1"
    local duration=${2:-3}
    local spinner_chars="${ICON_SPINNER}"
    
    for ((i=0; i<duration*4; i++)); do
        local char_index=$((i % 4))
        local spinner_char="${spinner_chars:$char_index:1}"
        printf "\r${COLORS_INFO}${spinner_char} ${message}${COLORS_RESET}"
        sleep 0.25
    done
    printf "\r${COLORS_SUCCESS}${ICON_CHECK} ${message}${COLORS_RESET}\n"
}

# Get CSRF crumb with enhanced error handling
get_crumb_with_session() {
    local cookie_jar=$(mktemp)
    local crumb_response
    
    if ! crumb_response=$(curl -s -c "$cookie_jar" \
        "$JENKINS_URL/crumbIssuer/api/json" \
        --user "$JENKINS_USER:$JENKINS_PASSWORD" 2>/dev/null); then
        echo "ERROR|Could not connect to Jenkins"
        return 1
    fi
    
    local crumb=$(echo "$crumb_response" | grep -o '"crumb":"[^"]*"' | cut -d'"' -f4)
    local crumb_field=$(echo "$crumb_response" | grep -o '"crumbRequestField":"[^"]*"' | cut -d'"' -f4)
    
    if [[ -z "$crumb" ]]; then
        echo "ERROR|Invalid Jenkins response"
        return 1
    fi
    
    echo "$cookie_jar|$crumb_field|$crumb"
}

# Enhanced build status with detailed information and Prisma diagnostics
get_detailed_build_status() {
    local job_name="$1"
    local api_url="$JENKINS_URL/job/$job_name/lastBuild/api/json"
    
    local status_data=$(curl -s "$api_url" --user "$JENKINS_USER:$JENKINS_PASSWORD" 2>/dev/null)
    
    if [[ -z "$status_data" || "$status_data" == "null" ]]; then
        echo "UNKNOWN|0|false|0|Never built|No data available"
        return
    fi
    
    local result=$(echo "$status_data" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    local number=$(echo "$status_data" | grep -o '"number":[0-9]*' | cut -d':' -f2)
    local building=$(echo "$status_data" | grep -o '"building":[^,}]*' | cut -d':' -f2)
    local duration=$(echo "$status_data" | grep -o '"duration":[0-9]*' | cut -d':' -f2)
    local timestamp=$(echo "$status_data" | grep -o '"timestamp":[0-9]*' | cut -d':' -f2 | head -1)
    local url=$(echo "$status_data" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    
    # Calculate human-readable duration
    local duration_sec=$((duration / 1000))
    local duration_str="0s"
    if [[ $duration_sec -gt 0 ]]; then
        local mins=$((duration_sec / 60))
        local secs=$((duration_sec % 60))
        if [[ $mins -gt 0 ]]; then
            duration_str="${mins}m ${secs}s"
        else
            duration_str="${secs}s"
        fi
    fi
    
    # Format timestamp safely
    local time_str="Unknown"
    if [[ -n "$timestamp" && "$timestamp" != "null" && "$timestamp" =~ ^[0-9]+$ ]]; then
        # Convert milliseconds to seconds and format
        local timestamp_sec=$((timestamp / 1000))
        time_str=$(date -r "$timestamp_sec" '+%H:%M:%S' 2>/dev/null || echo "Unknown")
    fi
    
    result=${result:-"UNKNOWN"}
    number=${number:-"0"}
    building=${building:-"false"}
    
    echo "$result|$number|$building|$duration_str|$time_str|$url"
}

# Enhanced error diagnosis for failed builds
diagnose_build_failure() {
    local job_name="$1"
    local build_number="$2"
    
    echo -e "${COLORS_ERROR}🔍 ${COLORS_BOLD}Diagnosing Build Failure${COLORS_RESET}"
    echo -e "${COLORS_INFO}Job:${COLORS_RESET} ${job_name}"
    echo -e "${COLORS_INFO}Build:${COLORS_RESET} #${build_number}"
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
    
    # Get console logs
    local console_url="$JENKINS_URL/job/$job_name/$build_number/consoleText"
    local console_logs=$(curl -s "$console_url" --user "$JENKINS_USER:$JENKINS_PASSWORD" 2>/dev/null)
    
    if [[ -n "$console_logs" ]]; then
        echo -e "${COLORS_INFO}🔍 Analyzing build logs...${COLORS_RESET}"
        
        # Check for common error patterns
        if echo "$console_logs" | grep -q -i "prisma"; then
            echo -e "${COLORS_WARNING}🗄️ Prisma-related issue detected:${COLORS_RESET}"
            echo "$console_logs" | grep -A 3 -B 3 -i "prisma" | tail -10
            echo -e "\n${COLORS_INFO}💡 Suggested fix:${COLORS_RESET} Regenerate Prisma client"
            
        elif echo "$console_logs" | grep -q -i "typescript\|type.*error"; then
            echo -e "${COLORS_WARNING}📝 TypeScript error detected:${COLORS_RESET}"
            echo "$console_logs" | grep -A 2 -B 2 -i "type.*error\|typescript" | tail -10
            echo -e "\n${COLORS_INFO}💡 Suggested fix:${COLORS_RESET} Check type definitions and imports"
            
        elif echo "$console_logs" | grep -q -i "npm.*install\|dependency"; then
            echo -e "${COLORS_WARNING}📦 Dependency issue detected:${COLORS_RESET}"
            echo "$console_logs" | grep -A 2 -B 2 -i "npm\|dependency\|install" | tail -10
            echo -e "\n${COLORS_INFO}💡 Suggested fix:${COLORS_RESET} Clear cache and reinstall dependencies"
            
        elif echo "$console_logs" | grep -q -i "build.*failed\|compilation.*failed"; then
            echo -e "${COLORS_WARNING}🏗️ Build compilation error detected:${COLORS_RESET}"
            echo "$console_logs" | grep -A 3 -B 3 -i "build.*failed\|compilation.*failed" | tail -10
            echo -e "\n${COLORS_INFO}💡 Suggested fix:${COLORS_RESET} Check source code for syntax errors"
            
        else
            echo -e "${COLORS_WARNING}❓ General build failure:${COLORS_RESET}"
            echo "$console_logs" | tail -20
        fi
        
        # Show last few error lines
        echo -e "\n${COLORS_ERROR}📋 Last 10 lines of build output:${COLORS_RESET}"
        echo "$console_logs" | tail -10
        
    else
        echo -e "${COLORS_ERROR}❌ Could not retrieve build logs${COLORS_RESET}"
    fi
    
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
}

# Professional build monitoring with rich information
monitor_build_progress() {
    local job_name="$1"
    local start_time=$(date +%s)
    local build_number=""
    
    echo -e "\n${COLORS_BG_DARK}${COLORS_PRIMARY}${COLORS_BOLD}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                        ${ICON_MONITOR} REAL-TIME BUILD MONITORING ${ICON_MONITOR}                        ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${COLORS_RESET}"
    
    echo -e "${COLORS_INFO}Target Job:${COLORS_RESET} ${COLORS_BOLD}$job_name${COLORS_RESET}"
    echo -e "${COLORS_INFO}Started:${COLORS_RESET} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}\n"
    
    while true; do
        local status_info=$(get_detailed_build_status "$job_name")
        IFS='|' read -r result number building duration_str time_str url <<< "$status_info"
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        local elapsed_str="${elapsed}s"
        if [[ $elapsed -gt 60 ]]; then
            elapsed_str="$((elapsed / 60))m $((elapsed % 60))s"
        fi
        
        # Clear previous lines
        printf "\033[2K\r"
        
        if [[ "$building" == "true" ]]; then
            local spinner_chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
            local spinner_index=$((elapsed % 10))
            local spinner_char="${spinner_chars:$spinner_index:1}"
            
            echo -e "${COLORS_WARNING}${spinner_char} ${COLORS_BOLD}Build #${number}${COLORS_RESET} ${COLORS_WARNING}${ICON_BUILDING} BUILDING${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Status:${COLORS_RESET} In Progress"
            echo -e "${COLORS_INFO}   Elapsed:${COLORS_RESET} ${elapsed_str}"
            echo -e "${COLORS_INFO}   Started:${COLORS_RESET} ${time_str}"
            printf "${COLORS_MUTED}   Monitoring... "
            
        elif [[ "$result" == "SUCCESS" ]]; then
            echo -e "${COLORS_BG_SUCCESS}${COLORS_BOLD} ${ICON_CHECK} BUILD SUCCESSFUL ${COLORS_RESET}"
            echo -e "${COLORS_SUCCESS}${ICON_DEPLOY} Build #${number} completed successfully${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Duration:${COLORS_RESET} ${duration_str}"
            echo -e "${COLORS_INFO}   Total Time:${COLORS_RESET} ${elapsed_str}"
            echo -e "${COLORS_INFO}   Finished:${COLORS_RESET} $(date '+%H:%M:%S')"
            if [[ -n "$url" ]]; then
                echo -e "${COLORS_INFO}   Build URL:${COLORS_RESET} ${url}"
            fi
            break
            
        elif [[ "$result" == "FAILURE" ]]; then
            echo -e "${COLORS_BG_ERROR}${COLORS_BOLD} ${ICON_CROSS} BUILD FAILED ${COLORS_RESET}"
            echo -e "${COLORS_ERROR}${ICON_CROSS} Build #${number} failed${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Duration:${COLORS_RESET} ${duration_str}"
            echo -e "${COLORS_INFO}   Total Time:${COLORS_RESET} ${elapsed_str}"
            echo -e "${COLORS_INFO}   Failed:${COLORS_RESET} $(date '+%H:%M:%S')"
            if [[ -n "$url" ]]; then
                echo -e "${COLORS_ERROR}   Build URL:${COLORS_RESET} ${url}console"
            fi
            break
            
        elif [[ "$result" == "ABORTED" ]]; then
            echo -e "${COLORS_WARNING}⚠️  Build #${number} was aborted${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Total Time:${COLORS_RESET} ${elapsed_str}"
            break
            
        else
            echo -e "${COLORS_ACCENT}${ICON_GEAR} Build #${number} ${COLORS_MUTED}${result}${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Status:${COLORS_RESET} Queued/Starting"
            echo -e "${COLORS_INFO}   Waiting:${COLORS_RESET} ${elapsed_str}"
            printf "${COLORS_MUTED}   Initializing... "
        fi
        
        sleep 1
        printf "\033[4A" # Move cursor up 4 lines for clean updates
    done
    
    echo -e "\n${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
    echo -e "${COLORS_SUCCESS}${ICON_CHECK} Monitoring completed at $(date '+%H:%M:%S')${COLORS_RESET}\n"
}

# Professional build trigger with enhanced feedback
trigger_build_professional() {
    local job_name="$1"
    local monitor_flag="$2"
    local branch_name=$(echo "$job_name" | sed 's/agent-activity-manager-*//' | sed 's/agent-activity-manager/in-progress/')
    [[ -z "$branch_name" ]] && branch_name="in-progress"
    
    echo -e "${COLORS_PRIMARY}${ICON_ROCKET} ${COLORS_BOLD}Triggering Build${COLORS_RESET}"
    echo -e "${COLORS_PRIMARY}Branch:${COLORS_RESET} ${COLORS_BOLD}$branch_name${COLORS_RESET}"
    echo -e "${COLORS_PRIMARY}Job:${COLORS_RESET} ${COLORS_BOLD}$job_name${COLORS_RESET}"
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
    
    # Authentication phase
    echo -e "${COLORS_INFO}${ICON_GEAR} Authenticating with Jenkins...${COLORS_RESET}"
    for i in {1..10}; do
        show_progress_bar $i 10 "Connecting"
        sleep 0.1
    done
    echo
    
    local crumb_data=$(get_crumb_with_session)
    if [[ $crumb_data == ERROR* ]]; then
        echo -e "${COLORS_ERROR}${ICON_CROSS} Authentication failed: ${crumb_data#ERROR|}${COLORS_RESET}"
        return 1
    fi
    
    IFS='|' read -r cookie_jar crumb_field crumb <<< "$crumb_data"
    echo -e "${COLORS_SUCCESS}${ICON_CHECK} Authentication successful${COLORS_RESET}"
    echo -e "${COLORS_MUTED}   CSRF Token: ${crumb:0:16}...${COLORS_RESET}"
    
    # Build trigger phase
    echo -e "\n${COLORS_INFO}${ICON_ROCKET} Submitting build request...${COLORS_RESET}"
    for i in {1..5}; do
        show_progress_bar $i 5 "Triggering"
        sleep 0.1
    done
    echo
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        -b "$cookie_jar" \
        -X POST "$JENKINS_URL/job/$job_name/build" \
        --user "$JENKINS_USER:$JENKINS_PASSWORD" \
        -H "$crumb_field: $crumb")
    
    rm -f "$cookie_jar"
    
    case "$response" in
        201)
            echo -e "${COLORS_SUCCESS}${ICON_CHECK} Build triggered successfully!${COLORS_RESET}"
            echo -e "${COLORS_INFO}   Response Code:${COLORS_RESET} ${response}"
            echo -e "${COLORS_INFO}   Build Queue:${COLORS_RESET} Job added to queue"
            
            if [[ "$monitor_flag" == "monitor" ]]; then
                echo -e "${COLORS_INFO}   Starting monitoring in 3 seconds...${COLORS_RESET}"
                sleep 3
                monitor_build_progress "$job_name"
            fi
            return 0
            ;;
        403)
            echo -e "${COLORS_ERROR}${ICON_CROSS} Access denied - CSRF protection issue${COLORS_RESET}"
            return 1
            ;;
        404)
            echo -e "${COLORS_ERROR}${ICON_CROSS} Job not found: ${job_name}${COLORS_RESET}"
            return 1
            ;;
        *)
            echo -e "${COLORS_WARNING}⚠️  Unexpected response: ${response}${COLORS_RESET}"
            return 1
            ;;
    esac
}

# Professional status dashboard with enhanced diagnostics
show_status_dashboard() {
    echo -e "${COLORS_PRIMARY}📊 ${COLORS_BOLD}Build Status Dashboard${COLORS_RESET}"
    echo -e "${COLORS_MUTED}Real-time status of all CI/CD pipelines${COLORS_RESET}\n"
    
    local jobs=(
        "agent-activity-manager:in-progress"
        "agent-activity-manager-development:development"
        "agent-activity-manager-publish:publish"
        "agent-activity-manager-main:main"
    )
    
    printf "${COLORS_PRIMARY}${COLORS_BOLD}%-15s %-10s %-12s %-10s %-10s %-s${COLORS_RESET}\n" \
        "BRANCH" "BUILD #" "STATUS" "DURATION" "TIME" "RESULT"
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
    
    local failed_builds=()
    
    for job_info in "${jobs[@]}"; do
        IFS=':' read -r job_name branch_name <<< "$job_info"
        local status_info=$(get_detailed_build_status "$job_name")
        IFS='|' read -r result number building duration_str time_str url <<< "$status_info"
        
        local status_icon=""
        local status_color=""
        local status_text=""
        
        if [[ "$building" == "true" ]]; then
            status_icon="🔨"
            status_color="${COLORS_WARNING}"
            status_text="BUILDING"
        elif [[ "$result" == "SUCCESS" ]]; then
            status_icon="✅"
            status_color="${COLORS_SUCCESS}"
            status_text="SUCCESS"
        elif [[ "$result" == "FAILURE" ]]; then
            status_icon="❌"
            status_color="${COLORS_ERROR}"
            status_text="FAILED"
            failed_builds+=("$job_name:$number")
        else
            status_icon="⚙️"
            status_color="${COLORS_MUTED}"
            status_text="${result:-UNKNOWN}"
        fi
        
        printf "${COLORS_BOLD}%-15s${COLORS_RESET} %-10s ${status_color}%-12s${COLORS_RESET} %-10s %-10s ${COLORS_INFO}%s${COLORS_RESET}\n" \
            "${branch_name}" "#${number}" "${status_icon} ${status_text}" "${duration_str}" "${time_str}" "${url:0:20}..."
    done
    
    echo -e "${COLORS_BORDER}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS_RESET}"
    echo -e "${COLORS_INFO}Last updated: $(date '+%Y-%m-%d %H:%M:%S')${COLORS_RESET}\n"
    
    # Show diagnostics for failed builds
    if [[ ${#failed_builds[@]} -gt 0 ]]; then
        echo -e "${COLORS_ERROR}🔧 ${COLORS_BOLD}Build Failure Analysis${COLORS_RESET}\n"
        
        for failed_build in "${failed_builds[@]}"; do
            IFS=':' read -r job_name build_number <<< "$failed_build"
            diagnose_build_failure "$job_name" "$build_number"
            echo ""
        done
        
        echo -e "${COLORS_INFO}💡 ${COLORS_BOLD}Quick Fix Commands:${COLORS_RESET}"
        echo -e "  ${COLORS_MUTED}• Clear cache: rm -rf node_modules package-lock.json .next${COLORS_RESET}"
        echo -e "  ${COLORS_MUTED}• Regenerate Prisma: npx prisma generate${COLORS_RESET}"
        echo -e "  ${COLORS_MUTED}• Type check: npx tsc --noEmit${COLORS_RESET}"
        echo -e "  ${COLORS_MUTED}• Test build: npm run build${COLORS_RESET}\n"
    fi
}

# Professional help menu
show_help_menu() {
    echo -e "${COLORS_PRIMARY}${COLORS_BOLD}Available Commands${COLORS_RESET}\n"
    
    echo -e "${COLORS_ACCENT}${ICON_ROCKET} ${COLORS_BOLD}CI/CD WORKFLOW:${COLORS_RESET}"
    echo -e "  ${COLORS_WARNING}1.${COLORS_RESET} Make changes locally"
    echo -e "  ${COLORS_WARNING}2.${COLORS_RESET} Commit: ${COLORS_MUTED}git add . && git commit -m \"message\"${COLORS_RESET}"
    echo -e "  ${COLORS_WARNING}3.${COLORS_RESET} Push: ${COLORS_MUTED}git push origin branch-name${COLORS_RESET}"
    echo -e "  ${COLORS_WARNING}4.${COLORS_RESET} Trigger build (Jenkins pulls from GitHub)\n"
    
    echo -e "${COLORS_ACCENT}${ICON_BRANCH} Branch Operations:${COLORS_RESET}"
    echo -e "  ${COLORS_BOLD}main${COLORS_RESET}         Trigger production build with monitoring"
    echo -e "  ${COLORS_BOLD}development${COLORS_RESET}  Trigger development build with monitoring"
    echo -e "  ${COLORS_BOLD}publish${COLORS_RESET}      Trigger staging build with monitoring"
    echo -e "  ${COLORS_BOLD}in-progress${COLORS_RESET}  Trigger in-progress build with monitoring"
    echo -e "  ${COLORS_BOLD}all${COLORS_RESET}          Trigger all builds sequentially\n"
    
    echo -e "${COLORS_ACCENT}${ICON_MONITOR} Monitoring Operations:${COLORS_RESET}"
    echo -e "  ${COLORS_BOLD}status${COLORS_RESET}       Show comprehensive build status dashboard"
    echo -e "  ${COLORS_BOLD}monitor <branch>${COLORS_RESET} Monitor specific build in real-time\n"
    
    echo -e "${COLORS_ACCENT}${ICON_GEAR} Examples:${COLORS_RESET}"
    echo -e "  ${COLORS_INFO}./trigger-builds.sh main${COLORS_RESET}              # Trigger main build"
    echo -e "  ${COLORS_INFO}./trigger-builds.sh status${COLORS_RESET}            # Show status dashboard"
    echo -e "  ${COLORS_INFO}./trigger-builds.sh monitor main${COLORS_RESET}      # Monitor main build"
    echo -e "  ${COLORS_INFO}./trigger-builds.sh all${COLORS_RESET}               # Trigger all builds\n"
    
    echo -e "${COLORS_ERROR}${COLORS_BOLD}⚠️  IMPORTANT:${COLORS_RESET} ${COLORS_WARNING}All changes must be pushed to GitHub before triggering builds!${COLORS_RESET}"
    echo -e "${COLORS_INFO}Jenkins builds from GitHub source, not local changes.${COLORS_RESET}\n"
}

# Main execution logic
main() {
    show_header
    
    case "${1:-help}" in
        "all")
            echo -e "${COLORS_PRIMARY}${ICON_ROCKET} ${COLORS_BOLD}Sequential Build Trigger${COLORS_RESET}"
            echo -e "${COLORS_INFO}Triggering all branch builds in sequence...${COLORS_RESET}\n"
            
            # Check git sync before triggering builds
            if ! check_git_sync; then
                echo -e "${COLORS_ERROR}❌ Aborting: Fix git sync issues before triggering builds${COLORS_RESET}"
                exit 1
            fi
            
            local jobs=("agent-activity-manager" "agent-activity-manager-development" "agent-activity-manager-publish" "agent-activity-manager-main")
            for job in "${jobs[@]}"; do
                trigger_build_professional "$job"
                if [[ $? -eq 0 ]]; then
                    echo -e "${COLORS_INFO}Waiting 30 seconds before next build...${COLORS_RESET}"
                    sleep 30
                fi
            done
            ;;
        "main")
            # Check git sync before triggering main build
            if ! check_git_sync; then
                echo -e "${COLORS_ERROR}❌ Aborting: Fix git sync issues before triggering main build${COLORS_RESET}"
                exit 1
            fi
            trigger_build_professional "agent-activity-manager-main" "monitor"
            ;;
        "development")
            # Check git sync before triggering development build
            if ! check_git_sync; then
                echo -e "${COLORS_ERROR}❌ Aborting: Fix git sync issues before triggering development build${COLORS_RESET}"
                exit 1
            fi
            trigger_build_professional "agent-activity-manager-development" "monitor"
            ;;
        "publish")
            # Check git sync before triggering publish build
            if ! check_git_sync; then
                echo -e "${COLORS_ERROR}❌ Aborting: Fix git sync issues before triggering publish build${COLORS_RESET}"
                exit 1
            fi
            trigger_build_professional "agent-activity-manager-publish" "monitor"
            ;;
        "in-progress")
            # Check git sync before triggering in-progress build
            if ! check_git_sync; then
                echo -e "${COLORS_ERROR}❌ Aborting: Fix git sync issues before triggering in-progress build${COLORS_RESET}"
                exit 1
            fi
            trigger_build_professional "agent-activity-manager" "monitor"
            ;;
        "status")
            show_status_dashboard
            ;;
        "monitor")
            if [[ -n "$2" ]]; then
                monitor_build_progress "agent-activity-manager-$2"
            else
                echo -e "${COLORS_ERROR}Usage: $0 monitor <branch>${COLORS_RESET}"
                echo -e "${COLORS_INFO}Available branches: main, development, publish, in-progress${COLORS_RESET}"
            fi
            ;;
        *)
            show_help_menu
            ;;
    esac
}

# Execute main function with all arguments
main "$@" 