'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCalendarWeek,
  faSave,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faUser,
  faUsers,
  faBullseye,
  faChartLine,
  faArrowTrendUp,
} from '@fortawesome/free-solid-svg-icons';
import { SaveStatus, ViewMode, TeamViewMode, CurrentView } from '@/lib/weekly-performance/types';

interface WeekNavigationControlsProps {
  // Week navigation
  startDate: string;
  endDate: string;
  startDateShort: string;
  endDateShort: string;
  isCurrentWeek: boolean;
  onNavigateWeek: (direction: number) => void;
  onGoToCurrentWeek: () => void;
  onGoToSeedWeek: () => void;

  // View controls
  hasTeamAccess: boolean;
  currentView: CurrentView;
  viewMode: ViewMode;
  teamViewMode: TeamViewMode;
  onCurrentViewChange: (view: CurrentView) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onTeamViewModeChange: (mode: TeamViewMode) => void;

  // Save status
  saveStatus: SaveStatus;
  lastSaved: string | null;
  userId?: number;

  // Error state
  error: string | null;
}

export default function WeekNavigationControls({
  startDate,
  endDate,
  startDateShort,
  endDateShort,
  isCurrentWeek,
  onNavigateWeek,
  onGoToCurrentWeek,
  onGoToSeedWeek,
  hasTeamAccess,
  currentView,
  viewMode,
  teamViewMode,
  onCurrentViewChange,
  onViewModeChange,
  onTeamViewModeChange,
  saveStatus,
  lastSaved,
  userId,
  error,
}: WeekNavigationControlsProps) {
  // Get save status display
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving':
        return { icon: faSpinner, text: 'Saving...', className: 'saving' };
      case 'saved':
        return { icon: faCheckCircle, text: 'Saved', className: 'saved' };
      case 'error':
        return { icon: faExclamationTriangle, text: 'Save Failed', className: 'error' };
      default:
        return null;
    }
  };

  return (
    <div className="week-navigation">
      <div className="week-navigation-top">
        <div className="week-controls">
          <button className="week-nav-btn" onClick={() => onNavigateWeek(-1)}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <div className="current-week-display">
            <div className="week-icon">
              <FontAwesomeIcon icon={faCalendarWeek} />
            </div>
            <div className="week-info">
              <h2 className="display-week">
                Week of {startDateShort} - {endDateShort}
              </h2>
              <div className="week-meta">
                <span className="week-range">
                  {startDate} to {endDate}
                </span>
                {!isCurrentWeek && (
                  <button className="btn-current-week" onClick={onGoToCurrentWeek}>
                    Go to Current Week
                  </button>
                )}
                <button className="btn-seed-week" onClick={onGoToSeedWeek}>
                  Go to Jan 2, 2025 (Seed Data)
                </button>
              </div>
            </div>
          </div>

          <button className="week-nav-btn" onClick={() => onNavigateWeek(1)}>
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>

        {/* View Mode Toggle and Save Controls */}
        <div className="controls-section">
          <div className="view-mode-toggle">
            {hasTeamAccess ? (
              <>
                {/* Personal/Team Toggle */}
                <button
                  className={`mode-btn ${currentView === 'personal' ? 'active' : ''}`}
                  onClick={() => onCurrentViewChange('personal')}
                >
                  <FontAwesomeIcon icon={faUser} />
                  My Performance
                </button>
                <button
                  className={`mode-btn ${currentView === 'team' ? 'active' : ''}`}
                  onClick={() => onCurrentViewChange('team')}
                >
                  <FontAwesomeIcon icon={faUsers} />
                  Agent Analytics
                </button>
              </>
            ) : (
              <>
                {/* Individual User View Modes */}
                <button
                  className={`mode-btn ${viewMode === 'forecast' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('forecast')}
                >
                  <FontAwesomeIcon icon={faBullseye} />
                  Forecast
                </button>
                <button
                  className={`mode-btn ${viewMode === 'actual' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('actual')}
                >
                  <FontAwesomeIcon icon={faChartLine} />
                  Actual
                </button>
                <button
                  className={`mode-btn ${viewMode === 'comparison' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('comparison')}
                >
                  <FontAwesomeIcon icon={faArrowTrendUp} />
                  Comparison
                </button>
              </>
            )}
          </div>

          {/* Secondary View Mode Toggle for Team Managers */}
          {hasTeamAccess && (
            <div className="secondary-view-toggle">
              {currentView === 'personal' ? (
                <>
                  <button
                    className={`mode-btn ${viewMode === 'forecast' ? 'active' : ''}`}
                    onClick={() => onViewModeChange('forecast')}
                  >
                    <FontAwesomeIcon icon={faBullseye} />
                    Forecast
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'actual' ? 'active' : ''}`}
                    onClick={() => onViewModeChange('actual')}
                  >
                    <FontAwesomeIcon icon={faChartLine} />
                    Actual
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'comparison' ? 'active' : ''}`}
                    onClick={() => onViewModeChange('comparison')}
                  >
                    <FontAwesomeIcon icon={faArrowTrendUp} />
                    Comparison
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`mode-btn ${teamViewMode === 'team' ? 'active' : ''}`}
                    onClick={() => onTeamViewModeChange('team')}
                  >
                    <FontAwesomeIcon icon={faUsers} />
                    Team Overview
                  </button>
                  <button
                    className={`mode-btn ${teamViewMode === 'forecast' ? 'active' : ''}`}
                    onClick={() => onTeamViewModeChange('forecast')}
                  >
                    <FontAwesomeIcon icon={faBullseye} />
                    Forecast Management
                  </button>
                  <button
                    className={`mode-btn ${teamViewMode === 'comparison' ? 'active' : ''}`}
                    onClick={() => onTeamViewModeChange('comparison')}
                  >
                    <FontAwesomeIcon icon={faArrowTrendUp} />
                    Analytics Comparison
                  </button>
                </>
              )}
            </div>
          )}

          <div className="save-controls">
            <div className="save-status">
              {!userId && (
                <div className="save-indicator error">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <span>Not authenticated</span>
                </div>
              )}
              {userId && getSaveStatusDisplay() && (
                <div className={`save-indicator ${getSaveStatusDisplay()?.className}`}>
                  <FontAwesomeIcon
                    icon={getSaveStatusDisplay()?.icon || faSave}
                    className={saveStatus === 'saving' ? 'spinning' : ''}
                  />
                  <span>{getSaveStatusDisplay()?.text}</span>
                </div>
              )}
              {lastSaved && (
                <div className="last-saved">
                  Last updated: {new Date(lastSaved).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-notice">
          <span className="notice-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
