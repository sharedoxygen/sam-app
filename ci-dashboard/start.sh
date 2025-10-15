#!/bin/bash

# 🚀 Jenkins CI/CD Dashboard Launcher
# Uses proxy server with same authentication as trigger-builds.sh

LOG_DIR="logs"
LOG_FILE="${LOG_DIR}/dashboard-console.log"

# Create log directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# These initial messages go to both terminal and log file
echo "🚀 Starting Jenkins CI/CD Dashboard" | tee -a "${LOG_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "${LOG_FILE}"

# Check if Node.js is available
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js detected - Starting proxy server..." | tee -a "${LOG_FILE}"
    echo "🔧 Using same authentication as trigger-builds.sh:" | tee -a "${LOG_FILE}"
    echo "   • Session cookies" | tee -a "${LOG_FILE}"
    echo "   • Basic authentication (admin:admin)" | tee -a "${LOG_FILE}"
    echo "   • CSRF protection" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    
    echo "🌐 Dashboard will be available at: http://localhost:7005" | tee -a "${LOG_FILE}"
    echo "🎯 Press Ctrl+C to stop" | tee -a "${LOG_FILE}"
    echo "💾 Node.js proxy server output will be logged exclusively to: ${LOG_FILE}" | tee -a "${LOG_FILE}"
    echo "   (Ongoing server activity will not appear in this terminal)" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    
    # Run Node.js proxy server, append its stdout and stderr exclusively to the log file
    node jenkins-proxy.js >> "${LOG_FILE}" 2>&1
    
elif command -v python3 >/dev/null 2>&1; then
    echo "⚠️  Node.js not found - Starting basic web server..." | tee -a "${LOG_FILE}"
    echo "❌ Note: Jenkins API features will not work without proxy server" | tee -a "${LOG_FILE}"
    echo "💡 Install Node.js for full functionality" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "🌐 Dashboard available at: http://localhost:7005" | tee -a "${LOG_FILE}"
    echo "🎯 Press Ctrl+C to stop" | tee -a "${LOG_FILE}"
    echo "💾 Python server output will be logged exclusively to: ${LOG_FILE}" | tee -a "${LOG_FILE}"
    echo "   (Ongoing server activity will not appear in this terminal)" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    python3 -m http.server 7005 >> "${LOG_FILE}" 2>&1
    
elif command -v python >/dev/null 2>&1; then
    echo "⚠️  Node.js not found - Starting basic web server..." | tee -a "${LOG_FILE}"
    echo "❌ Note: Jenkins API features will not work without proxy server" | tee -a "${LOG_FILE}"
    echo "💡 Install Node.js for full functionality" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "🌐 Dashboard available at: http://localhost:7005" | tee -a "${LOG_FILE}"
    echo "🎯 Press Ctrl+C to stop" | tee -a "${LOG_FILE}"
    echo "💾 Python server output will be logged exclusively to: ${LOG_FILE}" | tee -a "${LOG_FILE}"
    echo "   (Ongoing server activity will not appear in this terminal)" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    python -m SimpleHTTPServer 7005 >> "${LOG_FILE}" 2>&1
    
else
    # These messages also go to both terminal and log file
    echo "❌ Neither Node.js nor Python found!" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "📋 Installation options:" | tee -a "${LOG_FILE}"
    echo "  1. Install Node.js (recommended):" | tee -a "${LOG_FILE}"
    echo "     brew install node              # macOS" | tee -a "${LOG_FILE}"
    echo "     sudo apt install nodejs npm   # Ubuntu/Debian" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "  2. Install Python:" | tee -a "${LOG_FILE}"
    echo "     brew install python3          # macOS" | tee -a "${LOG_FILE}"
    echo "     sudo apt install python3      # Ubuntu/Ddebian" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "  3. Manual browser access:" | tee -a "${LOG_FILE}"
    echo "     Open index.html directly in browser" | tee -a "${LOG_FILE}"
    echo "     (Limited functionality - no Jenkins API)" | tee -a "${LOG_FILE}"
    exit 1
fi 