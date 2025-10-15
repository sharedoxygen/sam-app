/**
 * CI Dashboard Main Application
 * Handles UI interactions and coordinates with Jenkins API
 */

class CIDashboard {
  constructor() {
    this.jenkinsAPI = null;
    this.autoRefreshEnabled = true;
    this.currentTheme = 'default';
    this.currentLogViewBranch = null;
  }

  /**
   * Initialize the dashboard
   */
  async init() {
    console.log('Initializing CI Dashboard...');

    try {
      // Initialize Jenkins API
      this.jenkinsAPI = new JenkinsAPI();
      await this.jenkinsAPI.init();

      // Setup event listeners
      this.setupEventListeners();

      // Detect and apply theme
      this.detectTheme();

      // Initialize activity log
      this.initializeActivityLog();

      // Setup pipeline table
      this.setupPipelineTable(this.jenkinsAPI.branches);

      // Display current branch log
      this.displayCurrentBranchLog(null);

      this.setupRowClickListeners();

      console.log('CI Dashboard initialized successfully');
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      this.showErrorState();
    }
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.querySelector('[onclick="refreshStatus()"]');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshStatus();
    }

    // Auto-refresh toggle
    const autoRefreshBtn = document.querySelector('[onclick="toggleAutoRefresh()"]');
    if (autoRefreshBtn) {
      autoRefreshBtn.onclick = () => this.toggleAutoRefresh();
    }

    // Trigger all builds
    const triggerAllBtn = document.querySelector('[onclick="triggerAllBuilds()"]');
    if (triggerAllBtn) {
      triggerAllBtn.onclick = () => this.triggerAllBuilds();
    }

    // Abort all builds
    const abortAllBtn = document.querySelector('[onclick="abortAllBuilds()"]');
    if (abortAllBtn) {
      abortAllBtn.onclick = () => this.abortAllBuilds();
    }

    // Individual build triggers
    document.querySelectorAll('[onclick*="triggerBuild"]').forEach((btn) => {
      const branch = this.extractBranchFromOnclick(btn.onclick.toString());
      if (branch) {
        btn.onclick = () => this.triggerBuild(branch);
      }
    });

    // Log viewers
    document.querySelectorAll('[onclick*="viewLogs"]').forEach((btn) => {
      const branch = this.extractBranchFromOnclick(btn.onclick.toString());
      if (branch) {
        btn.onclick = () => this.viewLogs(branch);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            this.refreshStatus();
            break;
          case 't':
            e.preventDefault();
            this.triggerAllBuilds();
            break;
          case 'a':
            e.preventDefault();
            this.abortAllBuilds();
            break;
        }
      }
    });

    // Window focus event to refresh status
    window.addEventListener('focus', () => {
      if (this.jenkinsAPI) {
        this.jenkinsAPI.updateAllBuildStatus();
      }
    });

    // Current branch log refresh button
    const refreshCurrentLogBtn = document.getElementById('refreshCurrentLogBtn');
    if (refreshCurrentLogBtn) {
      refreshCurrentLogBtn.addEventListener('click', () => {
        if (this.currentLogViewBranch) {
          this.displayCurrentBranchLog(this.currentLogViewBranch);
        } else {
          this.jenkinsAPI.showToast('No branch selected to refresh log.', 'info');
        }
      });
    }
  }

  /**
   * Extract branch name from onclick attribute
   */
  extractBranchFromOnclick(onclickStr) {
    const match = onclickStr.match(/['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  }

  /**
   * Detect current theme (could be enhanced to detect from main app)
   */
  detectTheme() {
    // For now, default to light theme
    // Could be enhanced to communicate with main app or read from localStorage
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark) {
      this.setTheme('dark');
    } else {
      this.setTheme('default');
    }

    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark' : 'default');
    });
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    const html = document.documentElement;

    // Remove existing theme classes
    html.classList.remove('theme-default', 'theme-dark', 'theme-statefarm');

    // Add new theme class
    html.classList.add(`theme-${theme}`);

    this.currentTheme = theme;

    console.log(`Theme changed to: ${theme}`);
  }

  /**
   * Initialize activity log with welcome message
   */
  initializeActivityLog() {
    if (this.jenkinsAPI) {
      this.jenkinsAPI.addActivityLogEntry('CI Dashboard initialized successfully');
    }
  }

  /**
   * Refresh build status
   */
  async refreshStatus() {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    try {
      await this.jenkinsAPI.updateAllBuildStatus();
      this.jenkinsAPI.showToast('Status refreshed successfully', 'success');
      this.jenkinsAPI.addActivityLogEntry('Manual status refresh completed');
    } catch (error) {
      console.error('Failed to refresh status:', error);
      this.jenkinsAPI.showToast('Failed to refresh status', 'error');
    }
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    const isEnabled = this.jenkinsAPI.toggleAutoRefresh();

    // Update button text
    const statusEl = document.getElementById('autoRefreshStatus');
    if (statusEl) {
      statusEl.textContent = isEnabled ? 'ON' : 'OFF';
    }

    // Update button style
    const btn = document.querySelector('[onclick="toggleAutoRefresh()"]');
    if (btn) {
      if (isEnabled) {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-secondary');
      } else {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-warning');
      }
    }

    this.jenkinsAPI.showToast(
      `Auto-refresh ${isEnabled ? 'enabled' : 'disabled'}`,
      isEnabled ? 'success' : 'warning'
    );

    this.jenkinsAPI.addActivityLogEntry(`Auto-refresh ${isEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Trigger build for specific branch
   */
  async triggerBuild(branch) {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    await this.jenkinsAPI.triggerBuild(branch);
    this.displayCurrentBranchLog(branch);
  }

  /**
   * Trigger all builds
   */
  async triggerAllBuilds() {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    const confirmed = await this.showConfirmDialog(
      'Trigger All Builds',
      'Are you sure you want to trigger builds for all branches? This will start builds for in-progress, development, publish, and main branches.',
      'Trigger All',
      'cancel'
    );

    if (confirmed) {
      await this.jenkinsAPI.triggerAllBuilds();
    }
  }

  /**
   * Abort all builds
   */
  async abortAllBuilds() {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    const confirmed = await this.showConfirmDialog(
      'Abort All Builds',
      'Are you sure you want to abort all running builds? This action cannot be undone.',
      'Abort All',
      'warning'
    );

    if (confirmed) {
      await this.jenkinsAPI.abortAllBuilds();
    }
  }

  /**
   * View logs for specific branch
   */
  async viewLogs(branch) {
    if (!this.jenkinsAPI) {
      console.error('Jenkins API not initialized');
      return;
    }

    try {
      this.jenkinsAPI.showLoadingOverlay(`Loading logs for ${branch}...`);

      const logs = await this.jenkinsAPI.getBuildLogs(branch);

      this.jenkinsAPI.hideLoadingOverlay();

      this.showLogsModal(branch, logs);
    } catch (error) {
      this.jenkinsAPI.hideLoadingOverlay();
      console.error(`Failed to load logs for ${branch}:`, error);
      this.jenkinsAPI.showToast(`Failed to load logs for ${branch}`, 'error');
    }
  }

  /**
   * Show build logs in a modal with enhanced error analysis
   */
  showLogsModal(branch, logAnalysis) {
    const modal = this.createLogsModal(); // modal IS the backdrop element
    document.body.appendChild(modal);

    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Build Logs - ${branch}`;
    } else {
      console.error('Modal title element (.modal-title) not found within the created modal.');
    }

    // Create enhanced log content with error analysis
    const logContentPre = modal.querySelector('.log-content pre');
    if (logContentPre) {
      if (logAnalysis.hasErrors) {
        logContentPre.innerHTML = `
<div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 10px; margin-bottom: 15px; color: #721c24;">
  <h4 style="margin: 0 0 10px 0;">🔍 Build Error Analysis</h4>
  <p><strong>Issue:</strong> ${logAnalysis.summary}</p>
  <p><strong>Error Type:</strong> ${logAnalysis.errorType}</p>
  
  ${logAnalysis.suggestions.length > 0 ? `
  <details style="margin-top: 10px;">
    <summary style="cursor: pointer; font-weight: bold;">💡 Suggested Fixes</summary>
    <ul style="margin: 10px 0; padding-left: 20px;">
      ${logAnalysis.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
    </ul>
  </details>
  ` : ''}
</div>

<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 10px; margin-bottom: 15px; color: #155724;">
  <h4 style="margin: 0 0 10px 0;">🛠️ Quick Actions</h4>
  <p>After making fixes locally, trigger a new build:</p>
  <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">
    git add . && git commit -m "fix: address build issues" && git push
  </code>
</div>

<details style="margin-bottom: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
    📋 Full Build Logs
  </summary>
  <pre style="margin-top: 10px; max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">${logAnalysis.rawLogs || 'No logs available for this build.'}</pre>
</details>
        `;
      } else {
        logContentPre.innerHTML = `
<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 10px; margin-bottom: 15px; color: #155724;">
  <h4 style="margin: 0 0 10px 0;">✅ Build Successful</h4>
  <p>No errors detected in the build logs.</p>
</div>

<details>
  <summary style="cursor: pointer; font-weight: bold; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
    📋 Full Build Logs
  </summary>
  <pre style="margin-top: 10px; max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">${logAnalysis.rawLogs || 'No logs available for this build.'}</pre>
</details>
        `;
      }
    } else {
      console.error(
        'Modal log content element (.log-content pre) not found within the created modal.'
      );
    }

    const downloadBtn = modal.querySelector('.btn-download');
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadLog(branch, logAnalysis.rawLogs);
    } else {
      console.error('Modal download button (.btn-download) not found within the created modal.');
    }

    // Handle all close buttons (header 'x' and footer 'Close')
    modal.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.onclick = () => {
        if (modal.parentNode === document.body) {
          document.body.removeChild(modal);
        }
      };
    });

    // Click on backdrop (the modal element itself) to close
    // Ensure this only happens if the click is on the backdrop, not on the dialog content
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        // Check if the click target is the backdrop itself
        if (modal.parentNode === document.body) {
          document.body.removeChild(modal);
        }
      }
    });

    if (this.jenkinsAPI) {
      this.jenkinsAPI.addActivityLogEntry(`Viewed logs for ${branch}${logAnalysis.hasErrors ? ' (errors detected)' : ''}`);
    }
  }

  /**
   * Create and return the logs modal element
   */
  createLogsModal() {
    const modalHTML = `
            <div class="modal-backdrop">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h5 class="modal-title">Build Logs</h5>
                        <button type="button" class="btn-close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="log-content">
                            <pre></pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-close-modal">Close</button>
                        <button type="button" class="btn btn-primary btn-download">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            </div>
        `;
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    return modalElement.firstElementChild; // Return the .modal-backdrop element
  }

  /**
   * Download build logs as a text file
   */
  downloadLog(branchName, logContent) {
    if (!logContent) {
      this.jenkinsAPI.showToast('No log content to download.', 'warning');
      return;
    }

    const filename = `build_logs_${branchName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    this.jenkinsAPI.showToast(`Logs for ${branchName} downloaded as ${filename}`, 'success');
    this.jenkinsAPI.addActivityLogEntry(`Downloaded build logs for ${branchName}`);
  }

  /**
   * Show confirmation dialog
   */
  async showConfirmDialog(title, message, confirmText = 'Confirm', type = 'primary') {
    return new Promise((resolve) => {
      // Create confirmation modal
      const modal = document.createElement('div');
      modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content confirm-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary cancel-btn">Cancel</button>
                            <button class="btn btn-${type} confirm-btn">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.zIndex = '10001';
      modal.style.display = 'flex';

      document.body.appendChild(modal);

      // Handle button clicks
      modal.querySelector('.cancel-btn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };

      modal.querySelector('.confirm-btn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };

      // Handle overlay click
      modal.querySelector('.modal-overlay').onclick = (e) => {
        if (e.target === e.currentTarget) {
          document.body.removeChild(modal);
          resolve(false);
        }
      };
    });
  }

  /**
   * Show error state when initialization fails
   */
  showErrorState() {
    const statusIndicators = document.querySelectorAll('.status-badge');
    statusIndicators.forEach((indicator) => {
      indicator.className = 'status-badge failure';
      indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>ERROR</span>';
    });

    const buildNumbers = document.querySelectorAll('.build-number');
    buildNumbers.forEach((el) => {
      el.textContent = '#ERR';
    });

    // Show error message
    this.showToast('Failed to initialize CI Dashboard. Please check Jenkins connection.', 'error');
  }

  /**
   * Show toast notification (fallback if Jenkins API not available)
   */
  showToast(message, type = 'info') {
    if (this.jenkinsAPI) {
      this.jenkinsAPI.showToast(message, type);
    } else {
      console.log(`Toast: ${message} (${type})`);
    }
  }

  /**
   * Fetches and displays the latest build log for the specified branch in the 'Current Branch Log' viewer.
   * @param {string} branchName The name of the branch.
   */
  async displayCurrentBranchLog(branchName) {
    const currentLogBranchNameEl = document.getElementById('currentLogBranchName');
    const currentLogTextEl = document.getElementById('currentLogText');

    // Remove highlight from previously selected row
    document.querySelectorAll('.table-row.selected-for-log').forEach((row) => {
      row.classList.remove('selected-for-log');
    });

    if (!branchName) {
      currentLogBranchNameEl.textContent = 'None';
      currentLogTextEl.textContent =
        'No branch selected. Click a branch row or its actions in the table above.';
      this.currentLogViewBranch = null;
      return;
    }

    this.currentLogViewBranch = branchName;
    currentLogBranchNameEl.textContent = branchName;
    currentLogTextEl.textContent = 'Loading log...';
    this.jenkinsAPI.showLoadingOverlay(`Fetching log for ${branchName}...`);

    // Add highlight to the current branch's row
    const currentBranchRow = document.querySelector(`.table-row[data-branch="${branchName}"]`);
    if (currentBranchRow) {
      currentBranchRow.classList.add('selected-for-log');
    }

    try {
      const jobInfo = await this.jenkinsAPI.getJobInfo(branchName);
      let logData = '';

      if (jobInfo && jobInfo.lastBuild) {
        logData = await this.jenkinsAPI.getBuildLogs(branchName, jobInfo.lastBuild.number);
      } else {
        logData = `No builds found for branch: ${branchName}`;
      }

      currentLogTextEl.textContent = logData || 'Log is empty or not available.';
    } catch (error) {
      console.error(`Error fetching current log for ${branchName}:`, error);
      currentLogTextEl.textContent = `Failed to load log for ${branchName}.\n${error.message}`;
      this.jenkinsAPI.showToast(`Failed to load log for ${branchName}`, 'error');
    } finally {
      this.jenkinsAPI.hideLoadingOverlay();
    }
  }

  /**
   * Setup pipeline table
   */
  setupPipelineTable(branches) {
    // Implementation of setupPipelineTable method
  }

  setupRowClickListeners() {
    document.querySelectorAll('.table-row').forEach((row) => {
      const branch = row.dataset.branch;
      if (branch) {
        row.addEventListener('click', () => this.displayCurrentBranchLog(branch));
      }
    });
  }
}

// Global functions for onclick handlers (backwards compatibility)
let dashboardInstance = null;

window.refreshStatus = () => dashboardInstance?.refreshStatus();
window.toggleAutoRefresh = () => dashboardInstance?.toggleAutoRefresh();
window.triggerAllBuilds = () => dashboardInstance?.triggerAllBuilds();
window.abortAllBuilds = () => dashboardInstance?.abortAllBuilds();
window.triggerBuild = (branch) => dashboardInstance?.triggerBuild(branch);
window.viewLogs = (branch) => dashboardInstance?.viewLogs(branch);

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  dashboardInstance = new CIDashboard();
  await dashboardInstance.init();
});

// Export for external use
window.CIDashboard = CIDashboard;
