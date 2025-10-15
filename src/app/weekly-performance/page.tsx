'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPageHeaderForRole } from '@/lib/constants/roleConfig';
import { getAccessLevel, canEditForecasts } from '@/lib/weekly-performance/utils';
import { useWeeklyPerformance } from '@/hooks/useWeeklyPerformance';
import BackButton from '@/components/common/BackButton';
import WeekNavigationControls from '@/components/weekly-performance/WeekNavigationControls';
import PerformanceMetricsCard from '@/components/weekly-performance/PerformanceMetricsCard';
import TargetSettingModal from '@/components/weekly-performance/TargetSettingModal';
import ModernPerformanceCharts from '@/components/weekly/ModernPerformanceCharts';
import styles from './page.module.css';
import performanceTargetService, {
  PerformanceTargets,
} from '@/lib/services/performanceTargetService';

export default function WeeklyPerformance() {
  const { user } = useAuth();
  const {
    // State
    isLoading,
    saveStatus,
    lastSaved,
    error,
    viewMode,
    teamViewMode,
    currentView,
    individualPerformance,
    teamPerformance,
    showForecastModal,
    showAgentDetailModal,
    selectedAgentDetails,
    editingAgent,

    // Computed values
    hasTeamAccess,
    startDate,
    endDate,
    startDateShort,
    endDateShort,
    isCurrentWeek,

    // Actions
    setViewMode,
    setTeamViewMode,
    setCurrentView,
    setIndividualPerformance,
    navigateWeek,
    goToCurrentWeek,
    goToSeedWeek,
    openForecastEditor,
    closeForecastEditor,
    openAgentDetailModal,
    closeAgentDetailModal,
    updateEditingForecast,
    saveForecast,
    saveAgentForecast,
    weekOffset,
    loadWeekData,
  } = useWeeklyPerformance();

  // Get role-based access and page configuration
  const accessLevel = getAccessLevel(user?.role);
  const canEdit = canEditForecasts(user?.role);
  const pageHeader = getPageHeaderForRole(user?.role, 'weeklyPerformance');

  // Target setting modal state
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [currentTargets, setCurrentTargets] = useState<PerformanceTargets | null>(null);
  const [targetAgent, setTargetAgent] = useState<string>('');

  // Check if current user can set targets
  const canSetTargets =
    !!user?.role && ['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'].includes(user.role);

  // Load current targets for the user
  const loadCurrentTargets = async () => {
    if (!user?.id || !user?.role) return;

    try {
      const targets = await performanceTargetService.getTargetsForUser(
        typeof user.id === 'string' ? parseInt(user.id) : user.id,
        user.role as any,
        'weekly'
      );
      setCurrentTargets(targets);
    } catch (error) {
      console.error('Error loading targets:', error);
    }
  };

  // Handle opening target setting modal
  const handleEditTargets = () => {
    setTargetAgent(user?.name || 'Agent');
    loadCurrentTargets();
    setShowTargetModal(true);
  };

  // Handle saving targets
  const handleSaveTargets = async (targets: Partial<PerformanceTargets>) => {
    if (!user?.id || !user?.role) return;

    try {
      await performanceTargetService.setTargetsForUser(
        typeof user.id === 'string' ? parseInt(user.id) : user.id,
        targets,
        typeof user.id === 'string' ? parseInt(user.id) : user.id, // Manager ID (self for now)
        user.role as any,
        'weekly'
      );

      // Reload the targets and performance data
      await loadCurrentTargets();
      await loadWeekData(weekOffset);
    } catch (error) {
      console.error('Error saving targets:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className={styles.loadingContainer}>
      <div className={styles.spinnerBorder} role="status">
        <span className={styles.visuallyHidden}>Loading...</span>
      </div>
      <p>Loading weekly performance data...</p>
    </div>
  );

  return (
    <div className={styles.weeklyPerformanceContainer}>
      {/* Page header with role-based content */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <div className={styles.pageTitleSection}>
            <h1 className={styles.pageTitle}>{pageHeader.title}</h1>
            <p className={styles.pageSubtitle}>{pageHeader.subtitle}</p>
            <p className={styles.pageDescription}>{pageHeader.description}</p>
          </div>
          <BackButton />
        </div>
      </div>

      {/* Week Navigation Controls */}
      <WeekNavigationControls
        startDate={startDate}
        endDate={endDate}
        startDateShort={startDateShort}
        endDateShort={endDateShort}
        isCurrentWeek={isCurrentWeek()}
        onNavigateWeek={navigateWeek}
        onGoToCurrentWeek={goToCurrentWeek}
        onGoToSeedWeek={goToSeedWeek}
        hasTeamAccess={hasTeamAccess}
        currentView={currentView}
        viewMode={viewMode}
        teamViewMode={teamViewMode}
        onCurrentViewChange={setCurrentView}
        onViewModeChange={setViewMode}
        onTeamViewModeChange={setTeamViewMode}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        userId={
          user?.id ? (typeof user.id === 'number' ? user.id : parseInt(String(user.id))) : undefined
        }
        error={error}
      />

      {/* Main Content Area */}
      <div className={styles.performanceContent}>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Personal Performance View */}
            {(!hasTeamAccess || currentView === 'personal') && individualPerformance && (
              <div className={styles.individualPerformance}>
                {/* Forecast View */}
                {viewMode === 'forecast' && (
                  <div className={styles.forecastView}>
                    <PerformanceMetricsCard
                      title="Planned Interaction Targets"
                      metrics={individualPerformance.forecast}
                      userRole={user?.role}
                      canSetTargets={canSetTargets}
                      onEditTargets={handleEditTargets}
                    />

                    {/* Forecast Editor Form */}
                    <div className="elegant-forecast-card">
                      <div className="forecast-header">
                        <div className="header-content">
                          <h3 className="forecast-title">Edit Your Weekly Interaction Forecast</h3>
                          <p className="forecast-subtitle">
                            Set your planned interaction targets for this week
                          </p>
                        </div>
                      </div>

                      <div className="forecast-form-grid">
                        {/* Forecast input fields would go here */}
                        {/* This could be extracted into its own component */}
                        <div className="forecast-summary">
                          Total Planned:{' '}
                          {individualPerformance.forecast.peopleContacted +
                            individualPerformance.forecast.lifeSalesConversations +
                            individualPerformance.forecast.sales +
                            individualPerformance.forecast.referralRequests}
                        </div>
                      </div>

                      <div className="forecast-actions">
                        <button
                          className="save-forecast-btn"
                          onClick={() => saveForecast(individualPerformance.forecast)}
                          disabled={saveStatus === 'saving' || !user?.id}
                        >
                          {saveStatus === 'saving' ? 'Saving...' : 'Save Forecast'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actual View */}
                {viewMode === 'actual' && (
                  <div className="actual-view">
                    <PerformanceMetricsCard
                      title="Actual Performance"
                      metrics={individualPerformance.actual}
                    />
                  </div>
                )}

                {/* Comparison View */}
                {viewMode === 'comparison' && (
                  <div className="comparison-view-individual">
                    <PerformanceMetricsCard
                      title="Performance Analytics Overview"
                      metrics={individualPerformance.actual}
                      performanceData={individualPerformance.performanceMetrics}
                    />

                    {/* Modern Performance Charts */}
                    <div className="charts-wrapper">
                      <ModernPerformanceCharts
                        forecast={individualPerformance.forecast}
                        actual={individualPerformance.actual}
                        performanceMetrics={individualPerformance.performanceMetrics}
                        userRole={user?.role || 'AGENT'}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Performance View */}
            {hasTeamAccess && currentView === 'team' && teamPerformance && (
              <div className="team-performance">
                {teamViewMode === 'team' && (
                  <div className="team-overview">
                    <PerformanceMetricsCard
                      title="Aggregated Interaction Analytics"
                      metrics={teamPerformance.teamSummary}
                      isTeamSummary={true}
                    />

                    {/* Team Members Summary */}
                    <div className="agents-performance-section">
                      <div className="section-header">
                        <h3 className="section-title">Individual Agent Analytics</h3>
                        <p className="section-subtitle">
                          Performance metrics for {teamPerformance.teamSummary.totalAgents} team
                          members
                        </p>
                      </div>

                      <div className="agents-grid">
                        {teamPerformance.agents.map((agent) => (
                          <div key={agent.userId} className="agent-performance-card">
                            <div className="agent-card-header">
                              <div className="agent-info">
                                <h4 className="agent-name">{agent.userName}</h4>
                                <span className="agent-role">{agent.userRole}</span>
                              </div>
                              <button
                                className="btn-view-details"
                                onClick={() => openAgentDetailModal(agent)}
                              >
                                View Details
                              </button>
                            </div>

                            <PerformanceMetricsCard
                              title={`${agent.userName}'s Performance`}
                              metrics={agent.actual}
                              performanceData={agent.performanceMetrics}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {teamViewMode === 'forecast' && (
                  <div className="team-forecast-management">
                    <div className="team-forecast-header">
                      <h2>Team Forecast Management</h2>
                      <p>Review and manage forecasts for your team members</p>
                    </div>

                    <div className="team-forecast-grid">
                      {teamPerformance.agents.map((agent) => (
                        <div key={agent.userId} className="agent-forecast-card">
                          <div className="agent-forecast-header">
                            <div className="agent-info">
                              <h4>
                                <i className="fas fa-user"></i>
                                {agent.userName}
                              </h4>
                              <span className="agent-role">{agent.userRole}</span>
                            </div>
                            <div className="forecast-status">
                              {agent.forecast.peopleContacted > 0 ||
                              agent.forecast.lifeSalesConversations > 0 ||
                              agent.forecast.sales > 0 ||
                              agent.forecast.referralRequests > 0 ||
                              (agent.forecast.premiumAmount || 0) > 0 ? (
                                <span className="has-forecast">
                                  <i className="fas fa-check-circle"></i>
                                  Forecast Set
                                </span>
                              ) : (
                                <span className="no-forecast">
                                  <i className="fas fa-exclamation-triangle"></i>
                                  No Forecast
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="agent-forecast-metrics">
                            <div className="forecast-metric">
                              <label>People Contacted:</label>
                              <div className="metric-display">
                                <span className="current-value">
                                  {agent.forecast.peopleContacted}
                                </span>
                                <span className="vs-actual">
                                  vs {agent.actual.peopleContacted} actual
                                </span>
                              </div>
                            </div>
                            <div className="forecast-metric">
                              <label>Life/Sales Conversations:</label>
                              <div className="metric-display">
                                <span className="current-value">
                                  {agent.forecast.lifeSalesConversations}
                                </span>
                                <span className="vs-actual">
                                  vs {agent.actual.lifeSalesConversations} actual
                                </span>
                              </div>
                            </div>
                            <div className="forecast-metric">
                              <label>Sales Closed:</label>
                              <div className="metric-display">
                                <span className="current-value">{agent.forecast.sales}</span>
                                <span className="vs-actual">vs {agent.actual.sales} actual</span>
                              </div>
                            </div>
                            <div className="forecast-metric">
                              <label>Referral Requests:</label>
                              <div className="metric-display">
                                <span className="current-value">
                                  {agent.forecast.referralRequests}
                                </span>
                                <span className="vs-actual">
                                  vs {agent.actual.referralRequests} actual
                                </span>
                              </div>
                            </div>
                            <div className="forecast-metric premium-metric">
                              <label>Premium Amount:</label>
                              <div className="metric-display">
                                <span className="current-value premium-value">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(agent.forecast.premiumAmount || 0)}
                                </span>
                                <span className="vs-actual">
                                  vs{' '}
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(agent.actual.premiumAmount || 0)}{' '}
                                  actual
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="agent-forecast-actions">
                            <button
                              className="btn-edit-forecast"
                              onClick={() => openForecastEditor(agent)}
                            >
                              <i className="fas fa-edit"></i>
                              Edit Forecast
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {teamViewMode === 'comparison' && (
                  <div className="comparison-view">
                    <PerformanceMetricsCard
                      title="Team Analytics Overview"
                      metrics={teamPerformance.teamSummary}
                      isTeamSummary={true}
                    />

                    {/* Team Summary Charts */}
                    <div className="charts-wrapper">
                      <ModernPerformanceCharts
                        forecast={teamPerformance.teamSummary}
                        actual={teamPerformance.teamSummary}
                        performanceMetrics={{
                          peopleContacted: {
                            actual: teamPerformance.teamSummary.peopleContacted,
                            forecast: teamPerformance.teamSummary.peopleContacted,
                            percentage: 100,
                            variance: 0,
                          },
                          lifeSalesConversations: {
                            actual: teamPerformance.teamSummary.lifeSalesConversations,
                            forecast: teamPerformance.teamSummary.lifeSalesConversations,
                            percentage: 100,
                            variance: 0,
                          },
                          sales: {
                            actual: teamPerformance.teamSummary.sales,
                            forecast: teamPerformance.teamSummary.sales,
                            percentage: 100,
                            variance: 0,
                          },
                          referralRequests: {
                            actual: teamPerformance.teamSummary.referralRequests,
                            forecast: teamPerformance.teamSummary.referralRequests,
                            percentage: 100,
                            variance: 0,
                          },
                        }}
                        userRole={user?.role || 'SUPERVISOR'}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {/* Note: Modal components would be extracted into their own files */}
      {showForecastModal && editingAgent && (
        <div className={styles.modal} onClick={closeForecastEditor}>
          <div className={styles['forecast-modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Forecast for {editingAgent.userName}</h3>
              <button className={styles.closeBtn} onClick={closeForecastEditor}>
                ×
              </button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['forecast-form']}>
                <div className={styles['form-section']}>
                  <h4>Interaction Targets</h4>
                  <div className={styles['form-grid']}>
                    <div className={styles['form-group']}>
                      <label htmlFor="peopleContacted">People Contacted</label>
                      <input
                        type="number"
                        id="peopleContacted"
                        min="0"
                        max="999"
                        value={editingAgent.forecast.peopleContacted}
                        onChange={(e) =>
                          updateEditingForecast('peopleContacted', parseInt(e.target.value) || 0)
                        }
                        className={styles['form-input']}
                      />
                    </div>
                    <div className={styles['form-group']}>
                      <label htmlFor="lifeSalesConversations">Life/Sales Conversations</label>
                      <input
                        type="number"
                        id="lifeSalesConversations"
                        min="0"
                        max="999"
                        value={editingAgent.forecast.lifeSalesConversations}
                        onChange={(e) =>
                          updateEditingForecast(
                            'lifeSalesConversations',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className={styles['form-input']}
                      />
                    </div>
                    <div className={styles['form-group']}>
                      <label htmlFor="sales">Sales Closed</label>
                      <input
                        type="number"
                        id="sales"
                        min="0"
                        max="999"
                        value={editingAgent.forecast.sales}
                        onChange={(e) =>
                          updateEditingForecast('sales', parseInt(e.target.value) || 0)
                        }
                        className={styles['form-input']}
                      />
                    </div>
                    <div className={styles['form-group']}>
                      <label htmlFor="referralRequests">Referral Requests</label>
                      <input
                        type="number"
                        id="referralRequests"
                        min="0"
                        max="999"
                        value={editingAgent.forecast.referralRequests}
                        onChange={(e) =>
                          updateEditingForecast('referralRequests', parseInt(e.target.value) || 0)
                        }
                        className={styles['form-input']}
                      />
                    </div>
                  </div>
                </div>

                <div className={`${styles['form-section']} ${styles['premium-section']}`}>
                  <h4>Revenue Target</h4>
                  <div className={`${styles['form-group']} ${styles['premium-group']}`}>
                    <label htmlFor="premiumAmount">Premium Amount</label>
                    <div className={styles['premium-input-wrapper']}>
                      <span className={styles['currency-symbol']}>$</span>
                      <input
                        type="number"
                        id="premiumAmount"
                        min="0"
                        max="99000000"
                        step="0.01"
                        value={(editingAgent.forecast.premiumAmount || 0).toFixed(2)}
                        onChange={(e) => {
                          const numValue = parseFloat(e.target.value) || 0;
                          const constrainedValue = Math.min(Math.max(numValue, 0), 99000000);
                          updateEditingForecast('premiumAmount', constrainedValue);
                        }}
                        placeholder="0.00"
                        className={`${styles['form-input']} ${styles['premium-input']}`}
                      />
                    </div>
                    <div className={styles['input-help']}>Maximum: $99,000,000.00</div>
                  </div>
                </div>
              </div>

              <div className={styles['forecast-summary']}>
                <h4>Current vs Target</h4>
                <div className={styles['summary-grid']}>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Total Interactions:</span>
                    <span className={styles['summary-value']}>
                      {editingAgent.forecast.peopleContacted +
                        editingAgent.forecast.lifeSalesConversations +
                        editingAgent.forecast.referralRequests}{' '}
                      planned
                    </span>
                  </div>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Revenue Target:</span>
                    <span className={`${styles['summary-value']} ${styles['premium-value']}`}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(editingAgent.forecast.premiumAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={closeForecastEditor}>
                Cancel
              </button>
              <button
                className={styles['btn-primary']}
                onClick={() => saveAgentForecast()}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Forecast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgentDetailModal && selectedAgentDetails && (
        <div className="modal-overlay" onClick={closeAgentDetailModal}>
          <div className="agent-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedAgentDetails.userName} Performance Details</h3>
              <button className="modal-close" onClick={closeAgentDetailModal}>
                ×
              </button>
            </div>
            {/* Modal content would go here */}
          </div>
        </div>
      )}

      {/* Target Setting Modal */}
      <TargetSettingModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        onSave={handleSaveTargets}
        currentTargets={currentTargets || undefined}
        agentName={targetAgent}
        isLoading={isLoading}
      />
    </div>
  );
}
