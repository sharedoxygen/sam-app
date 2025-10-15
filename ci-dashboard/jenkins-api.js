/**
 * Jenkins API Integration
 * Handles all communication with Jenkins REST API through proxy server
 */

class JenkinsAPI {
  constructor() {
    this.baseUrl = '/jenkins-proxy'; // Use proxy instead of direct Jenkins
    this.branches = ['in-progress', 'development', 'publish', 'main'];

    // Map branches to actual Jenkins job names
    this.jobMapping = {
      'in-progress': 'agent-activity-manager',
      development: 'agent-activity-manager-development',
      publish: 'agent-activity-manager-publish',
      main: 'agent-activity-manager-main',
    };

    this.updateInterval = null;
    this.autoRefresh = true;

    // Cache for storing build data
    this.buildCache = new Map();
    this.lastUpdateTime = null;
  }

  /**
   * Get Jenkins job name for a branch
   */
  getJobName(branch) {
    return this.jobMapping[branch] || `agent-activity-manager-${branch}`;
  }

  /**
   * Get authentication headers for Jenkins requests
   */
  getAuthHeaders() {
    const credentials = btoa(`${this.username}:${this.password}`);
    return {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    };
  }

  /**
   * Make request through the proxy server
   */
  async makeProxyRequest(path, method = 'GET', headers = {}) {
    const url = `${this.baseUrl}${path}`;

    const options = {
      method: method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    };

    const response = await fetch(url, options);
    return response;
  }

  /**
   * Initialize the API and start monitoring
   */
  async init() {
    try {
      await this.checkJenkinsStatus();
      await this.updateAllBuildStatus();

      if (this.autoRefresh) {
        this.startAutoRefresh();
      }

      console.log('Jenkins API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Jenkins API:', error);
      this.showToast('Failed to connect to Jenkins', 'error');
    }
  }

  /**
   * Check if Jenkins is accessible through proxy
   */
  async checkJenkinsStatus() {
    try {
      const response = await this.makeProxyRequest('/api/json');

      if (response.ok) {
        this.updateJenkinsStatus('online');
        return true;
      } else {
        throw new Error(`Jenkins responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Jenkins status check failed:', error);
      this.updateJenkinsStatus('offline');
      return false;
    }
  }

  /**
   * Update Jenkins status indicator in UI
   */
  updateJenkinsStatus(status) {
    const statusElement = document.getElementById('jenkinsStatus');
    const statusDot = statusElement.querySelector('.status-dot');

    if (status === 'online') {
      statusDot.style.color = 'var(--success-color)';
      statusElement.querySelector('span').textContent = 'Jenkins Online';
    } else {
      statusDot.style.color = 'var(--danger-color)';
      statusElement.querySelector('span').textContent = 'Jenkins Offline';
    }
  }

  /**
   * Get job information for a specific branch
   */
  async getJobInfo(branch) {
    try {
      const jobName = this.getJobName(branch);
      const jobUrl = `/job/${jobName}/api/json`;
      const response = await this.makeProxyRequest(jobUrl);

      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        console.warn(`Job not found for branch: ${branch} (${jobName})`);
        return null;
      } else {
        throw new Error(`Failed to fetch job info: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching job info for ${branch}:`, error);
      return null;
    }
  }

  /**
   * Get the latest build information for a branch
   */
  async getLatestBuild(branch) {
    try {
      const jobInfo = await this.getJobInfo(branch);
      if (!jobInfo || !jobInfo.lastBuild) {
        return null;
      }

      const buildUrl = `${jobInfo.lastBuild.url}api/json`.replace('http://localhost:9080', '');
      const response = await this.makeProxyRequest(buildUrl);

      if (response.ok) {
        const buildInfo = await response.json();
        return {
          number: buildInfo.number,
          status: this.getBuildStatus(buildInfo),
          duration: this.formatDuration(buildInfo.duration),
          timestamp: buildInfo.timestamp,
          result: buildInfo.result,
          building: buildInfo.building,
          url: buildInfo.url,
        };
      }
    } catch (error) {
      console.error(`Error fetching latest build for ${branch}:`, error);
    }
    return null;
  }

  /**
   * Determine build status from Jenkins build info
   */
  getBuildStatus(buildInfo) {
    if (buildInfo.building) {
      return 'building';
    } else if (buildInfo.result === 'SUCCESS') {
      return 'success';
    } else if (buildInfo.result === 'FAILURE') {
      return 'failure';
    } else if (buildInfo.result === 'ABORTED') {
      return 'aborted';
    } else if (buildInfo.result === 'UNSTABLE') {
      return 'unstable';
    } else {
      return 'unknown';
    }
  }

  /**
   * Format build duration
   */
  formatDuration(duration) {
    if (!duration || duration === 0) {
      return '--:--';
    }

    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp) {
    if (!timestamp) {
      return '--:--:--';
    }

    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Get CSRF crumb for POST requests
   */
  async getCrumb() {
    try {
      const response = await fetch(`${this.baseUrl}/crumbIssuer/api/json`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          crumb: data.crumb,
          crumbRequestField: data.crumbRequestField,
        };
      }
    } catch (error) {
      console.warn('Could not get CSRF crumb:', error);
    }
    return null;
  }

  /**
   * Trigger a build for a specific branch
   */
  async triggerBuild(branch) {
    try {
      // Immediately show preparing status
      this.updateBuildUI(branch, {
        number: '--',
        status: 'preparing',
        duration: '--:--',
        timestamp: null,
      });
      this.addActivityLogEntry(`Preparing to trigger build for ${branch}`);

      const jobName = this.getJobName(branch);
      const buildUrl = `/job/${jobName}/build`;

      // Show loading state
      this.showLoadingOverlay(`Triggering ${branch} build...`);

      const response = await this.makeProxyRequest(buildUrl, 'POST');

      this.hideLoadingOverlay();

      if (response.ok || response.status === 201) {
        this.showToast(`${branch} build triggered successfully`, 'success');

        // Update status immediately and then start polling
        setTimeout(() => {
          this.updateBuildStatus(branch);
        }, 2000);

        // Add activity log entry
        this.addActivityLogEntry(`Build triggered for ${branch}`);

        return true;
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to trigger build: ${response.status} ${errorText}`);
      }
    } catch (error) {
      this.hideLoadingOverlay();
      console.error(`Error triggering build for ${branch}:`, error);
      this.showToast(`Failed to trigger ${branch} build: ${error.message}`, 'error');

      // Reset status on error
      this.updateBuildStatus(branch);

      return false;
    }
  }

  /**
   * Abort a build for a specific branch
   */
  async abortBuild(branch) {
    try {
      const jobInfo = await this.getJobInfo(branch);
      if (!jobInfo || !jobInfo.lastBuild) {
        throw new Error('No active build found');
      }

      const stopUrl = `${jobInfo.lastBuild.url}stop`.replace('http://localhost:9080', '');

      this.showLoadingOverlay(`Aborting ${branch} build...`);

      const response = await this.makeProxyRequest(stopUrl, 'POST');

      this.hideLoadingOverlay();

      if (response.ok) {
        this.showToast(`${branch} build aborted`, 'success');
        this.addActivityLogEntry(`Build aborted for ${branch}`);

        // Update status
        setTimeout(() => {
          this.updateBuildStatus(branch);
        }, 1000);

        return true;
      } else {
        throw new Error(`Failed to abort build: ${response.status}`);
      }
    } catch (error) {
      this.hideLoadingOverlay();
      console.error(`Error aborting build for ${branch}:`, error);
      this.showToast(`Failed to abort ${branch} build: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get build logs for a specific branch with enhanced error analysis
   */
  async getBuildLogs(branch, buildNumber = null) {
    try {
      const jobName = this.getJobName(branch);
      let logUrl;

      if (buildNumber) {
        logUrl = `/job/${jobName}/${buildNumber}/consoleText`;
      } else {
        const jobInfo = await this.getJobInfo(branch);
        if (!jobInfo || !jobInfo.lastBuild) {
          throw new Error('No build found');
        }
        logUrl = `${jobInfo.lastBuild.url}consoleText`.replace('http://localhost:9080', '');
      }

      const response = await this.makeProxyRequest(logUrl, 'GET', {
        Accept: 'text/plain',
      });

      if (response.ok) {
        const logs = await response.text();
        return this.analyzeBuildLogs(logs, branch);
      } else {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching logs for ${branch}:`, error);
      throw error;
    }
  }

  /**
   * Analyze build logs for common issues and provide suggestions
   */
  analyzeBuildLogs(logs, branch) {
    const analysis = {
      rawLogs: logs,
      hasErrors: false,
      errorType: 'unknown',
      suggestions: [],
      summary: 'Build completed successfully'
    };

    // Check for various error patterns
    if (logs.includes('ERROR: script returned exit code 1') || logs.includes('FAILURE')) {
      analysis.hasErrors = true;
      
      if (logs.toLowerCase().includes('prisma')) {
        analysis.errorType = 'prisma';
        analysis.suggestions = [
          'Regenerate Prisma client: npx prisma generate',
          'Check Prisma schema file exists',
          'Verify database connection configuration'
        ];
        analysis.summary = '🗄️ Prisma-related build failure detected';
        
      } else if (logs.toLowerCase().includes('type') && logs.toLowerCase().includes('error')) {
        analysis.errorType = 'typescript';
        analysis.suggestions = [
          'Check TypeScript type definitions',
          'Verify import statements',
          'Run type check: npx tsc --noEmit'
        ];
        analysis.summary = '📝 TypeScript compilation error detected';
        
      } else if (logs.toLowerCase().includes('npm') || logs.toLowerCase().includes('dependency')) {
        analysis.errorType = 'dependency';
        analysis.suggestions = [
          'Clear npm cache: npm cache clean --force',
          'Delete node_modules and reinstall: rm -rf node_modules && npm install',
          'Check package.json for invalid dependencies'
        ];
        analysis.summary = '📦 Dependency installation issue detected';
        
      } else if (logs.toLowerCase().includes('build') && logs.toLowerCase().includes('failed')) {
        analysis.errorType = 'build';
        analysis.suggestions = [
          'Check source code for syntax errors',
          'Verify all imports and exports',
          'Try clean build: rm -rf .next && npm run build'
        ];
        analysis.summary = '🏗️ Build compilation error detected';
        
      } else {
        analysis.errorType = 'general';
        analysis.suggestions = [
          'Check Jenkins console output for specific errors',
          'Verify all environment variables are set',
          'Contact development team for assistance'
        ];
        analysis.summary = '❓ General build failure detected';
      }
    }

    return analysis;
  }

  /**
   * Update build status for a specific branch
   */
  async updateBuildStatus(branch) {
    try {
      const buildInfo = await this.getLatestBuild(branch);

      if (buildInfo) {
        this.buildCache.set(branch, buildInfo);
        this.updateBuildUI(branch, buildInfo);
      } else {
        // No build found, show placeholder
        this.updateBuildUI(branch, {
          number: '--',
          status: 'no-build',
          duration: '--:--',
          timestamp: null,
        });
      }
    } catch (error) {
      console.error(`Error updating build status for ${branch}:`, error);
      // Show error state
      this.updateBuildUI(branch, {
        number: '--',
        status: 'error',
        duration: '--:--',
        timestamp: null,
      });
    }
  }

  /**
   * Update build information in the UI
   */
  updateBuildUI(branch, buildInfo) {
    const buildNumberEl = document.getElementById(`build-${branch}`);
    const statusEl = document.getElementById(`status-${branch}`);
    const durationEl = document.getElementById(`duration-${branch}`);
    const timeEl = document.getElementById(`time-${branch}`);

    if (buildNumberEl) {
      buildNumberEl.textContent = buildInfo.number !== '--' ? `#${buildInfo.number}` : '#--';
    }

    if (statusEl) {
      const statusIcon = statusEl.querySelector('i');
      const statusText = statusEl.querySelector('span');

      // Reset classes
      statusEl.className = 'status-badge';

      switch (buildInfo.status) {
        case 'success':
          statusEl.classList.add('success');
          statusIcon.className = 'fas fa-check-circle';
          statusText.textContent = 'SUCCESS';
          break;
        case 'failure':
          statusEl.classList.add('failure');
          statusIcon.className = 'fas fa-times-circle';
          statusText.textContent = 'FAILED';
          break;
        case 'building':
          statusEl.classList.add('building');
          statusIcon.className = 'fas fa-spinner fa-spin';
          statusText.textContent = 'BUILDING';
          break;
        case 'preparing':
          statusEl.classList.add('building');
          statusIcon.className = 'fas fa-hourglass-half';
          statusText.textContent = 'PREPARING';
          break;
        case 'aborted':
          statusEl.classList.add('failure');
          statusIcon.className = 'fas fa-ban';
          statusText.textContent = 'ABORTED';
          break;
        case 'no-build':
          statusEl.classList.add('loading');
          statusIcon.className = 'fas fa-minus-circle';
          statusText.textContent = 'NO BUILD';
          break;
        default:
          statusEl.classList.add('loading');
          statusIcon.className = 'fas fa-question-circle';
          statusText.textContent = 'UNKNOWN';
      }
    }

    if (durationEl) {
      durationEl.textContent = buildInfo.duration || '--:--';
    }

    if (timeEl) {
      timeEl.textContent = buildInfo.timestamp
        ? this.formatTimestamp(buildInfo.timestamp)
        : '--:--:--';
    }
  }

  /**
   * Update all build statuses
   */
  async updateAllBuildStatus() {
    const promises = this.branches.map((branch) => this.updateBuildStatus(branch));
    await Promise.all(promises);

    this.lastUpdateTime = new Date();
    this.updateLastUpdatedTime();
  }

  /**
   * Update the last updated time in UI
   */
  updateLastUpdatedTime() {
    const updateTimeEl = document.getElementById('updateTime');
    if (updateTimeEl && this.lastUpdateTime) {
      updateTimeEl.textContent = this.lastUpdateTime.toLocaleTimeString();
    }
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateAllBuildStatus();
    }, 10000); // Update every 10 seconds

    this.autoRefresh = true;
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.autoRefresh = false;
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }

    return this.autoRefresh;
  }

  /**
   * Trigger all builds
   */
  async triggerAllBuilds() {
    this.showLoadingOverlay('Triggering all builds...');

    // Show preparing status for all branches immediately
    for (const branch of this.branches) {
      this.updateBuildUI(branch, {
        number: '--',
        status: 'preparing',
        duration: '--:--',
        timestamp: null,
      });
    }
    this.addActivityLogEntry('Preparing to trigger all builds');

    const results = [];
    for (const branch of this.branches) {
      try {
        const jobName = this.getJobName(branch);
        const buildUrl = `/job/${jobName}/build`;

        const response = await this.makeProxyRequest(buildUrl, 'POST');

        if (response.ok || response.status === 201) {
          results.push({ branch, success: true });

          // Update status after successful trigger
          setTimeout(() => {
            this.updateBuildStatus(branch);
          }, 2000);
        } else {
          const errorText = await response.text();
          throw new Error(`Failed to trigger build: ${response.status} ${errorText}`);
        }

        // Small delay between triggers
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ branch, success: false, error });
        // Reset status on error
        this.updateBuildStatus(branch);
      }
    }

    this.hideLoadingOverlay();

    const successful = results.filter((r) => r.success).length;
    const message = `Triggered ${successful}/${this.branches.length} builds successfully`;

    this.showToast(message, successful === this.branches.length ? 'success' : 'warning');
    this.addActivityLogEntry(
      `Bulk build trigger: ${successful}/${this.branches.length} successful`
    );

    return results;
  }

  /**
   * Abort all builds
   */
  async abortAllBuilds() {
    this.showLoadingOverlay('Aborting all builds...');

    const results = [];
    for (const branch of this.branches) {
      try {
        const result = await this.abortBuild(branch);
        results.push({ branch, success: result });
      } catch (error) {
        results.push({ branch, success: false, error });
      }
    }

    this.hideLoadingOverlay();

    const successful = results.filter((r) => r.success).length;
    const message = `Aborted ${successful} builds`;

    this.showToast(message, 'warning');
    this.addActivityLogEntry(`Bulk build abort: ${successful} builds stopped`);

    return results;
  }

  /**
   * Add entry to activity log
   */
  addActivityLogEntry(message) {
    const activityLog = document.getElementById('activityLog');
    if (!activityLog) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';

    const timestamp = new Date().toLocaleTimeString();

    activityItem.innerHTML = `
            <div class="activity-time">${timestamp}</div>
            <div class="activity-message">${message}</div>
        `;

    // Insert at the beginning
    const existingItems = activityLog.querySelectorAll('.activity-item');
    if (existingItems.length > 0) {
      activityLog.insertBefore(activityItem, existingItems[0]);
    } else {
      activityLog.appendChild(activityItem);
    }

    // Keep only the last 10 items
    const items = activityLog.querySelectorAll('.activity-item');
    if (items.length > 10) {
      for (let i = 10; i < items.length; i++) {
        items[i].remove();
      }
    }
  }

  /**
   * Show loading overlay
   */
  showLoadingOverlay(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');

    if (text) {
      text.textContent = message;
    }

    overlay.classList.add('active');
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon i');
    const messageEl = toast.querySelector('.toast-message');

    // Update content
    messageEl.textContent = message;

    // Update icon based on type
    switch (type) {
      case 'success':
        icon.className = 'fas fa-check-circle';
        icon.style.color = 'var(--success-color)';
        break;
      case 'error':
        icon.className = 'fas fa-exclamation-circle';
        icon.style.color = 'var(--danger-color)';
        break;
      case 'warning':
        icon.className = 'fas fa-exclamation-triangle';
        icon.style.color = 'var(--warning-color)';
        break;
      default:
        icon.className = 'fas fa-info-circle';
        icon.style.color = 'var(--info-color)';
    }

    // Show toast
    toast.classList.add('show');

    // Hide after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
}

// Export for use in other files
window.JenkinsAPI = JenkinsAPI;
