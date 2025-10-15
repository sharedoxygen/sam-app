'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import styles from './PipelineManagementModalSimple.module.css'; // Import CSS Module

type DailyPipelineData = {
  quotesAuto: number;
  quotesLife: number;
  quotesFire: number;
  quotesAutoRN: number; // Auto quotes that are Raw New
  quotesAutoML: number; // Auto quotes that are Multi-line
  quotesLifeRN: number; // Life quotes that are Raw New
  quotesLifeML: number; // Life quotes that are Multi-line
  quotesFireRN: number; // Fire quotes that are Raw New
  quotesFireML: number; // Fire quotes that are Multi-line
  clientOutreachCalls: number;
};

type PipelineManagementModalSimpleProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DailyPipelineData) => void;
  selectedDate: string;
  initialData?: DailyPipelineData;
};

const PIPELINE_METRICS = [
  {
    key: 'quotesAuto',
    label: 'Auto Quotes',
    icon: '🚗',
    color: '#007bff',
    target: 6,
    description: 'Auto insurance quotes generated',
    hasIndicators: true,
    indicatorKeys: ['quotesAutoRN', 'quotesAutoML'],
  },
  {
    key: 'quotesLife',
    label: 'Life Quotes',
    icon: '❤️',
    color: '#28a745',
    target: 4,
    description: 'Life & health insurance quotes generated',
    hasIndicators: true,
    indicatorKeys: ['quotesLifeRN', 'quotesLifeML'],
  },
  {
    key: 'quotesFire',
    label: 'Fire Quotes',
    icon: '🏠',
    color: '#fd7e14',
    target: 3,
    description: 'Property & fire insurance quotes generated',
    hasIndicators: true,
    indicatorKeys: ['quotesFireRN', 'quotesFireML'],
  },
  {
    key: 'clientOutreachCalls',
    label: 'Client Outreach Calls',
    icon: '📞',
    color: '#6f42c1',
    target: 15,
    description: 'Calls made to clients and prospects',
    hasIndicators: false,
  },
];

export default function PipelineManagementModalSimple({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  initialData,
}: PipelineManagementModalSimpleProps) {
  const [data, setData] = useState<DailyPipelineData>({
    quotesAuto: 0,
    quotesLife: 0,
    quotesFire: 0,
    quotesAutoRN: 0,
    quotesAutoML: 0,
    quotesLifeRN: 0,
    quotesLifeML: 0,
    quotesFireRN: 0,
    quotesFireML: 0,
    clientOutreachCalls: 0,
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    } else {
      setData({
        quotesAuto: 0,
        quotesLife: 0,
        quotesFire: 0,
        quotesAutoRN: 0,
        quotesAutoML: 0,
        quotesLifeRN: 0,
        quotesLifeML: 0,
        quotesFireRN: 0,
        quotesFireML: 0,
        clientOutreachCalls: 0,
      });
    }
  }, [initialData, selectedDate]);

  const updateValue = (metric: keyof DailyPipelineData, value: number) => {
    setData((prev) => ({
      ...prev,
      [metric]: Math.max(0, value),
    }));
  };

  const increment = (metric: keyof DailyPipelineData) => {
    updateValue(metric, data[metric] + 1);
  };

  const decrement = (metric: keyof DailyPipelineData) => {
    const currentValue = data[metric];

    if (currentValue > 0) {
      updateValue(metric, currentValue - 1);

      // Adjust indicators if necessary for quote metrics
      if (metric === 'quotesAuto') {
        if (data.quotesAutoRN > currentValue - 1) {
          updateValue('quotesAutoRN', currentValue - 1);
        }
        if (data.quotesAutoML > currentValue - 1) {
          updateValue('quotesAutoML', currentValue - 1);
        }
      } else if (metric === 'quotesLife') {
        if (data.quotesLifeRN > currentValue - 1) {
          updateValue('quotesLifeRN', currentValue - 1);
        }
        if (data.quotesLifeML > currentValue - 1) {
          updateValue('quotesLifeML', currentValue - 1);
        }
      } else if (metric === 'quotesFire') {
        if (data.quotesFireRN > currentValue - 1) {
          updateValue('quotesFireRN', currentValue - 1);
        }
        if (data.quotesFireML > currentValue - 1) {
          updateValue('quotesFireML', currentValue - 1);
        }
      }
    }
  };

  const toggleIndicator = (quoteType: 'Auto' | 'Life' | 'Fire', indicator: 'RN' | 'ML') => {
    const indicatorKey = `quotes${quoteType}${indicator}` as keyof DailyPipelineData;
    const quotesKey = `quotes${quoteType}` as keyof DailyPipelineData;
    const currentQuotes = data[quotesKey];
    const currentIndicatorValue = data[indicatorKey];

    // Can't have more indicators than total quotes
    if (currentIndicatorValue < currentQuotes) {
      updateValue(indicatorKey, currentIndicatorValue + 1);
    } else {
      updateValue(indicatorKey, 0); // Reset to 0 if at max
    }
  };

  const handleInputChange = (metric: keyof DailyPipelineData, value: string) => {
    const numValue = parseInt(value) || 0;
    updateValue(metric, numValue);

    // If changing quotes, adjust indicators if they exceed new value
    if (metric === 'quotesAuto') {
      if (data.quotesAutoRN > numValue) {
        updateValue('quotesAutoRN', numValue);
      }
      if (data.quotesAutoML > numValue) {
        updateValue('quotesAutoML', numValue);
      }
    } else if (metric === 'quotesLife') {
      if (data.quotesLifeRN > numValue) {
        updateValue('quotesLifeRN', numValue);
      }
      if (data.quotesLifeML > numValue) {
        updateValue('quotesLifeML', numValue);
      }
    } else if (metric === 'quotesFire') {
      if (data.quotesFireRN > numValue) {
        updateValue('quotesFireRN', numValue);
      }
      if (data.quotesFireML > numValue) {
        updateValue('quotesFireML', numValue);
      }
    }
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const getTotalActivity = () => {
    return data.quotesAuto + data.quotesLife + data.quotesFire + data.clientOutreachCalls;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0; // Avoid division by zero
    return Math.min((current / target) * 100, 100);
  };

  const getConversionRate = () => {
    if (data.clientOutreachCalls === 0) return 0;
    const totalQuotes = data.quotesAuto + data.quotesLife + data.quotesFire;
    return Math.round((totalQuotes / data.clientOutreachCalls) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className={styles['modal-backdrop']}>
      <div className={styles['modal-container']}>
        <div className={styles['modal-content']}>
          <div className={styles['modal-header']}>
            <div className={styles['header-content']}>
              <h2 className={styles['modal-title']}>Pipeline Management</h2>
              <p className={styles['modal-subtitle']}>Track your pipeline activity for</p>
              <p className={styles['modal-date']}>{formatDate(selectedDate)}</p>
            </div>
            <button className={styles['close-button']} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className={styles['modal-body']}>
            {/* Summary Cards */}
            <div className={styles['summary-grid']}>
              <div className={styles['summary-card']}>
                <div className={styles['summary-icon']}>📊</div>
                <div className={styles['summary-content']}>
                  <h3 className={styles['summary-value']}>{getTotalActivity()}</h3>
                  <p className={styles['summary-label']}>Total Activities</p>
                  {(data.quotesAutoRN > 0 ||
                    data.quotesAutoML > 0 ||
                    data.quotesLifeRN > 0 ||
                    data.quotesLifeML > 0 ||
                    data.quotesFireRN > 0 ||
                    data.quotesFireML > 0) && (
                    <div className={styles['summary-indicators']}>
                      {data.quotesAutoRN > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.rn}`}>RN</span>{' '}
                          Auto {data.quotesAutoRN}
                        </span>
                      )}
                      {data.quotesAutoML > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.ml}`}>ML</span>{' '}
                          Auto {data.quotesAutoML}
                        </span>
                      )}
                      {data.quotesLifeRN > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.rn}`}>RN</span>{' '}
                          Life {data.quotesLifeRN}
                        </span>
                      )}
                      {data.quotesLifeML > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.ml}`}>ML</span>{' '}
                          Life {data.quotesLifeML}
                        </span>
                      )}
                      {data.quotesFireRN > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.rn}`}>RN</span>{' '}
                          Fire {data.quotesFireRN}
                        </span>
                      )}
                      {data.quotesFireML > 0 && (
                        <span className={styles['indicator-stat']}>
                          <span className={`${styles['indicator-badge']} ${styles.ml}`}>ML</span>{' '}
                          Fire {data.quotesFireML}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {data.clientOutreachCalls > 0 && (
                <div className={`${styles['summary-card']} ${styles.conversion}`}>
                  <div className={styles['summary-icon']}>🎯</div>
                  <div className={styles['summary-content']}>
                    <h3 className={styles['summary-value']}>{getConversionRate()}%</h3>
                    <p className={styles['summary-label']}>Quote Rate</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metric Cards */}
            <div className={styles['metric-cards']}>
              {PIPELINE_METRICS.map((metric) => {
                const value = data[metric.key as keyof DailyPipelineData];
                const progressPercentage = getProgressPercentage(value, metric.target);

                return (
                  <div key={metric.key} className={styles['metric-card']}>
                    <div className={styles['metric-header']}>
                      <div className={styles['metric-info']}>
                        <span className={styles['metric-card-icon']}>{metric.icon}</span>
                        <div>
                          <h4 className={styles['metric-name']}>{metric.label}</h4>
                          <p className={styles['metric-description']}>{metric.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className={styles['input-section']}>
                      <div className={styles['input-controls']}>
                        <button
                          className={`${styles['control-btn']} ${styles.decrement}`}
                          onClick={() => decrement(metric.key as keyof DailyPipelineData)}
                          disabled={value === 0}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>

                        <input
                          type="number"
                          className={styles['value-input']}
                          value={value}
                          onChange={(e) =>
                            handleInputChange(metric.key as keyof DailyPipelineData, e.target.value)
                          }
                          min="0"
                        />

                        <button
                          className={`${styles['control-btn']} ${styles.increment}`}
                          onClick={() => increment(metric.key as keyof DailyPipelineData)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>

                      {metric.hasIndicators && value > 0 && (
                        <div className={styles['indicator-controls']}>
                          {metric.key === 'quotesAuto' && (
                            <>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesAutoRN > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Auto', 'RN')}
                                title="Raw New - New prospects with no prior insurance"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.rn}`}>
                                  RN
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesAutoRN}/{value}
                                </span>
                              </button>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesAutoML > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Auto', 'ML')}
                                title="Multi-line - Prospects interested in multiple products"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.ml}`}>
                                  ML
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesAutoML}/{value}
                                </span>
                              </button>
                            </>
                          )}
                          {metric.key === 'quotesLife' && (
                            <>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesLifeRN > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Life', 'RN')}
                                title="Raw New - New prospects with no prior insurance"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.rn}`}>
                                  RN
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesLifeRN}/{value}
                                </span>
                              </button>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesLifeML > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Life', 'ML')}
                                title="Multi-line - Prospects interested in multiple products"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.ml}`}>
                                  ML
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesLifeML}/{value}
                                </span>
                              </button>
                            </>
                          )}
                          {metric.key === 'quotesFire' && (
                            <>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesFireRN > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Fire', 'RN')}
                                title="Raw New - New prospects with no prior insurance"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.rn}`}>
                                  RN
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesFireRN}/{value}
                                </span>
                              </button>
                              <button
                                className={`${styles['indicator-btn']} ${data.quotesFireML > 0 ? styles.active : ''}`}
                                onClick={() => toggleIndicator('Fire', 'ML')}
                                title="Multi-line - Prospects interested in multiple products"
                              >
                                <span className={`${styles['indicator-badge']} ${styles.ml}`}>
                                  ML
                                </span>
                                <span className={styles['indicator-count']}>
                                  {data.quotesFireML}/{value}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div className={styles['progress-section']}>
                        <div className={styles['progress-bar']}>
                          <div
                            className={`${styles['progress-fill']} ${styles['with-dynamic-color']}`}
                            ref={(el) => {
                              if (el) {
                                el.style.width = `${progressPercentage}%`;
                                el.style.setProperty('--progress-color', metric.color);
                              }
                            }}
                          />
                        </div>
                        <span
                          className={`${styles['progress-text']} ${styles['with-dynamic-color']}`}
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty('--progress-color', metric.color);
                            }
                          }}
                        >
                          {value} / {metric.target} ({Math.round(progressPercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles['modal-footer']}>
            <button className={styles['btn-secondary']} onClick={onClose}>
              Cancel
            </button>
            <button className={styles['btn-primary']} onClick={handleSave}>
              <FontAwesomeIcon icon={faSave} />
              Save Pipeline Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
