'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faEye,
  faBullseye,
  faUsers,
  faComments,
  faHandshake,
  faDollarSign,
  faArrowUp,
  faArrowDown,
  faMinus,
} from '@fortawesome/free-solid-svg-icons';

// Data types
type WeeklyForecast = {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
};

type PerformanceMetric = {
  actual: number;
  forecast: number;
  percentage: number;
  variance: number;
};

type PerformanceMetrics = {
  peopleContacted: PerformanceMetric;
  lifeSalesConversations: PerformanceMetric;
  sales: PerformanceMetric;
  referralRequests: PerformanceMetric;
};

interface WeeklyForecastGridProps {
  forecast: WeeklyForecast;
  actual: WeeklyForecast;
  performanceMetrics: PerformanceMetrics;
  viewMode: 'forecast' | 'actual' | 'comparison';
  onForecastChange: (forecast: WeeklyForecast) => void;
  allowEdit: boolean;
}

const WeeklyForecastGrid: React.FC<WeeklyForecastGridProps> = ({
  forecast,
  actual,
  performanceMetrics,
  viewMode,
  onForecastChange,
  allowEdit,
}) => {
  // Handle input changes for forecast
  const handleInputChange = (field: keyof WeeklyForecast, value: number) => {
    if (!allowEdit) return;

    const newForecast = {
      ...forecast,
      [field]: Math.max(0, value), // Ensure non-negative values
    };
    onForecastChange(newForecast);
  };

  // Get performance indicator icon and class
  const getPerformanceIndicator = (metric: PerformanceMetric) => {
    if (metric.percentage >= 100) {
      return { icon: faArrowUp, className: 'performance-up' };
    } else if (metric.percentage >= 80) {
      return { icon: faMinus, className: 'performance-neutral' };
    } else {
      return { icon: faArrowDown, className: 'performance-down' };
    }
  };

  // Format percentage display
  const formatPercentage = (percentage: number) => {
    return `${percentage}%`;
  };

  // Get variance display with sign
  const formatVariance = (variance: number) => {
    if (variance === 0) return '±0';
    return variance > 0 ? `+${variance}` : `${variance}`;
  };

  const metrics = [
    {
      key: 'peopleContacted' as keyof WeeklyForecast,
      label: 'People Contacted',
      icon: faUsers,
      description: 'Total contacts made during the week',
    },
    {
      key: 'lifeSalesConversations' as keyof WeeklyForecast,
      label: 'Life/Sales Conversations',
      icon: faComments,
      description: 'Meaningful sales conversations',
    },
    {
      key: 'sales' as keyof WeeklyForecast,
      label: 'Sales Closed',
      icon: faDollarSign,
      description: 'Completed sales transactions',
    },
    {
      key: 'referralRequests' as keyof WeeklyForecast,
      label: 'Referral Requests',
      icon: faHandshake,
      description: 'Referrals requested from clients',
    },
  ];

  return (
    <div className="weekly-forecast-grid">
      <div className="grid-header">
        <h3 className="grid-title">
          <FontAwesomeIcon icon={faBullseye} />
          Weekly Performance Metrics
        </h3>
        <div className="view-mode-indicator">
          <FontAwesomeIcon icon={viewMode === 'forecast' ? faEdit : faEye} />
          <span>
            {viewMode === 'forecast' && 'Forecast Entry'}
            {viewMode === 'actual' && 'Actual Results'}
            {viewMode === 'comparison' && 'Performance Comparison'}
          </span>
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => {
          const performanceData = performanceMetrics[metric.key];
          const performanceIndicator = getPerformanceIndicator(performanceData);

          return (
            <div key={metric.key} className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <FontAwesomeIcon icon={metric.icon} />
                </div>
                <div className="metric-info">
                  <h4 className="metric-label">{metric.label}</h4>
                  <p className="metric-description">{metric.description}</p>
                </div>
              </div>

              <div className="metric-values">
                {viewMode === 'forecast' && (
                  <div className="forecast-input-section">
                    <label className="input-label">Forecast</label>
                    <input
                      type="number"
                      value={forecast[metric.key]}
                      onChange={(e) => handleInputChange(metric.key, parseInt(e.target.value) || 0)}
                      className="forecast-input"
                      min="0"
                      disabled={!allowEdit}
                    />
                  </div>
                )}

                {viewMode === 'actual' && (
                  <div className="actual-display-section">
                    <label className="value-label">Actual Result</label>
                    <div className="actual-value">{actual[metric.key]}</div>
                  </div>
                )}

                {viewMode === 'comparison' && (
                  <div className="comparison-section">
                    <div className="value-row">
                      <span className="value-label">Forecast:</span>
                      <span className="value-number">{performanceData.forecast}</span>
                    </div>
                    <div className="value-row">
                      <span className="value-label">Actual:</span>
                      <span className="value-number">{performanceData.actual}</span>
                    </div>
                    <div className="performance-summary">
                      <div className={`performance-indicator ${performanceIndicator.className}`}>
                        <FontAwesomeIcon icon={performanceIndicator.icon} />
                        <span className="performance-percentage">
                          {formatPercentage(performanceData.percentage)}
                        </span>
                      </div>
                      <div className="variance-display">
                        <span className="variance-label">Variance:</span>
                        <span
                          className={`variance-value ${performanceData.variance >= 0 ? 'positive' : 'negative'}`}
                        >
                          {formatVariance(performanceData.variance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyForecastGrid;
