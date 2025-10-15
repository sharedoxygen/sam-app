'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import styles from './RevenueGenerationModalSimple.module.css';

type DailyRevenueData = {
  automotive: number;
  automotiveRN: number; // How many automotive sales were Raw New
  automotiveML: number; // How many automotive sales were Multi-line
  automotivePremium: number; // Total premium amount for automotive sales
  lifeHealth: number;
  lifeHealthRN: number;
  lifeHealthML: number;
  lifeHealthPremium: number; // Total premium amount for life & health sales
  propertyFire: number;
  propertyFireRN: number;
  propertyFireML: number;
  propertyFirePremium: number; // Total premium amount for property & fire sales
};

type RevenueGenerationModalSimpleProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DailyRevenueData) => void;
  selectedDate: string;
  initialData?: DailyRevenueData;
};

const PRODUCT_LINES = [
  {
    key: 'automotive',
    label: 'Automotive Insurance',
    icon: '🚗',
    color: '#007bff',
    target: 5,
  },
  {
    key: 'lifeHealth',
    label: 'Life & Health Insurance',
    icon: '❤️',
    color: '#28a745',
    target: 3,
  },
  {
    key: 'propertyFire',
    label: 'Property & Fire Insurance',
    icon: '🏠',
    color: '#fd7e14',
    target: 2,
  },
];

export default function RevenueGenerationModalSimple({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  initialData,
}: RevenueGenerationModalSimpleProps) {
  const [data, setData] = useState<DailyRevenueData>({
    automotive: 0,
    automotiveRN: 0,
    automotiveML: 0,
    automotivePremium: 0,
    lifeHealth: 0,
    lifeHealthRN: 0,
    lifeHealthML: 0,
    lifeHealthPremium: 0,
    propertyFire: 0,
    propertyFireRN: 0,
    propertyFireML: 0,
    propertyFirePremium: 0,
  });

  // Track editing state for premium inputs to handle formatting properly
  const [editingPremium, setEditingPremium] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    } else {
      // Reset to zero when opening for a new date
      setData({
        automotive: 0,
        automotiveRN: 0,
        automotiveML: 0,
        automotivePremium: 0,
        lifeHealth: 0,
        lifeHealthRN: 0,
        lifeHealthML: 0,
        lifeHealthPremium: 0,
        propertyFire: 0,
        propertyFireRN: 0,
        propertyFireML: 0,
        propertyFirePremium: 0,
      });
    }
    // Clear editing state when modal opens
    setEditingPremium({});
  }, [initialData, selectedDate]);

  const updateValue = (field: keyof DailyRevenueData, value: number) => {
    setData((prev) => ({
      ...prev,
      [field]: Math.max(0, value),
    }));
  };

  const validateAndFormatPremiumAmount = (value: string): string => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');

    // Handle empty string
    if (!cleanValue || cleanValue === '.') return '';

    // Split by decimal point
    const parts = cleanValue.split('.');

    // Only allow one decimal point
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit integer part to 8 digits (allows up to $99,999,999.99)
    let integerPart = parts[0];
    if (integerPart.length > 8) {
      integerPart = integerPart.substring(0, 8);
    }

    // Limit decimal part to 2 digits
    let decimalPart = parts[1] || '';
    if (decimalPart.length > 2) {
      decimalPart = decimalPart.substring(0, 2);
    }

    // Return formatted string
    if (parts.length === 2) {
      return integerPart + '.' + decimalPart;
    }

    return integerPart;
  };

  const parsePremiumAmount = (value: string): number => {
    if (!value) return 0;
    const numValue = parseFloat(value) || 0;
    // Maximum allowed: $99,999,999.99
    const maxValue = 99999999.99;
    return Math.min(numValue, maxValue);
  };

  const formatPremiumDisplay = (value: number, isEditing: boolean = false): string => {
    if (isEditing) {
      // During editing, show raw number format
      return value === 0 ? '' : value.toString();
    }

    if (value === 0) return '0.00';

    // Format with commas and exactly 2 decimal places for display
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePremiumInputChange = (productKey: string, inputValue: string) => {
    const formattedValue = validateAndFormatPremiumAmount(inputValue);
    setEditingPremium((prev) => ({ ...prev, [productKey]: formattedValue }));

    const numericValue = parsePremiumAmount(formattedValue);
    updateValue(`${productKey}Premium` as keyof DailyRevenueData, numericValue);
  };

  const handlePremiumInputFocus = (productKey: string) => {
    const currentValue = data[`${productKey}Premium` as keyof DailyRevenueData];
    setEditingPremium((prev) => ({
      ...prev,
      [productKey]: currentValue === 0 ? '' : currentValue.toString(),
    }));
  };

  const handlePremiumInputBlur = (productKey: string) => {
    // Clear editing state to show formatted display
    setEditingPremium((prev) => {
      const newState = { ...prev };
      delete newState[productKey];
      return newState;
    });
  };

  const getPremiumInputValue = (productKey: string): string => {
    const isEditing = editingPremium.hasOwnProperty(productKey);
    if (isEditing) {
      return editingPremium[productKey];
    }

    const currentValue = data[`${productKey}Premium` as keyof DailyRevenueData];
    return formatPremiumDisplay(currentValue, false);
  };

  const increment = (productLine: string) => {
    updateValue(
      productLine as keyof DailyRevenueData,
      data[productLine as keyof DailyRevenueData] + 1
    );
  };

  const decrement = (productLine: string) => {
    const currentValue = data[productLine as keyof DailyRevenueData];
    const rnKey = `${productLine}RN` as keyof DailyRevenueData;
    const mlKey = `${productLine}ML` as keyof DailyRevenueData;

    // When decrementing, also ensure indicators don't exceed the new total
    if (currentValue > 0) {
      updateValue(productLine as keyof DailyRevenueData, currentValue - 1);

      // Adjust indicators if necessary
      if (data[rnKey] > currentValue - 1) {
        updateValue(rnKey, currentValue - 1);
      }
      if (data[mlKey] > currentValue - 1) {
        updateValue(mlKey, currentValue - 1);
      }
    }
  };

  const toggleIndicator = (productLine: string, indicator: 'RN' | 'ML') => {
    const indicatorKey = `${productLine}${indicator}` as keyof DailyRevenueData;
    const currentSales = data[productLine as keyof DailyRevenueData];
    const currentIndicatorValue = data[indicatorKey];

    // Can't have more indicators than total sales
    if (currentIndicatorValue < currentSales) {
      updateValue(indicatorKey, currentIndicatorValue + 1);
    } else {
      updateValue(indicatorKey, 0); // Reset to 0 if at max
    }
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const getTotalSales = () => {
    // Only count actual sales, not indicators
    return data.automotive + data.lifeHealth + data.propertyFire;
  };

  const getTotalRN = () => {
    return data.automotiveRN + data.lifeHealthRN + data.propertyFireRN;
  };

  const getTotalML = () => {
    return data.automotiveML + data.lifeHealthML + data.propertyFireML;
  };

  const getTotalPremium = () => {
    return data.automotivePremium + data.lifeHealthPremium + data.propertyFirePremium;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
    return Math.min((current / target) * 100, 100);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div className={styles.headerContent}>
              <h2 className={styles.modalTitle}>Revenue Generation</h2>
              <p className={styles.modalSubtitle}>Enter closed sales for</p>
              <p className={styles.modalDate}>{formatDate(selectedDate)}</p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* Summary Card */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon}>💰</div>
              <div className={styles.summaryContent}>
                <h3 className={styles.summaryValue}>{getTotalSales()}</h3>
                <p className={styles.summaryLabel}>Total Sales Today</p>
                <div className={styles.summaryMetrics}>
                  <div className={styles.summaryIndicators}>
                    <span className={styles.indicatorStat}>
                      <span className={styles.indicatorBadge + ' ' + styles.rn}>RN</span>{' '}
                      {getTotalRN()}
                    </span>
                    <span className={styles.indicatorStat}>
                      <span className={styles.indicatorBadge + ' ' + styles.ml}>ML</span>{' '}
                      {getTotalML()}
                    </span>
                  </div>
                  <div className={styles.premiumAmount}>
                    <span className={styles.premiumLabel}>Total Premium:</span>
                    <span className={styles.premiumValue}>{formatCurrency(getTotalPremium())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Lines */}
            <div className={styles.productLines}>
              {PRODUCT_LINES.map((product) => {
                const salesCount = data[product.key as keyof DailyRevenueData];
                const rnCount = data[`${product.key}RN` as keyof DailyRevenueData];
                const mlCount = data[`${product.key}ML` as keyof DailyRevenueData];
                const progressPercentage = getProgressPercentage(salesCount, product.target);

                return (
                  <div key={product.key} className={styles.productCard}>
                    <div className={styles.productHeader}>
                      <div className={styles.productInfo}>
                        <span className={styles.productIcon}>{product.icon}</span>
                        <div>
                          <h4 className={styles.productName}>{product.label}</h4>
                          <p className={styles.productTarget}>Daily target: {product.target}</p>
                        </div>
                      </div>
                    </div>

                    <div className={styles.inputSection}>
                      <div className={styles.inputControls}>
                        <button
                          className={styles.controlBtn + ' ' + styles.decrement}
                          onClick={() => decrement(product.key)}
                          disabled={salesCount === 0}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>

                        <input
                          type="number"
                          className={styles.valueInput}
                          value={salesCount}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0;
                            updateValue(product.key as keyof DailyRevenueData, newValue);
                            // Adjust indicators if they exceed new value
                            const rnKey = `${product.key}RN` as keyof DailyRevenueData;
                            const mlKey = `${product.key}ML` as keyof DailyRevenueData;
                            if (data[rnKey] > newValue) updateValue(rnKey, newValue);
                            if (data[mlKey] > newValue) updateValue(mlKey, newValue);
                          }}
                          min="0"
                        />

                        <button
                          className={styles.controlBtn + ' ' + styles.increment}
                          onClick={() => increment(product.key)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>

                      {salesCount > 0 && (
                        <div className={styles.indicatorControls}>
                          <button
                            className={
                              styles.indicatorBtn + (rnCount > 0 ? ' ' + styles.active : '')
                            }
                            onClick={() => toggleIndicator(product.key, 'RN')}
                            title="Raw New - New customers with no prior coverage"
                          >
                            <span className={styles.indicatorBadge + ' ' + styles.rn}>RN</span>
                            <span className={styles.indicatorCount}>
                              {rnCount}/{salesCount}
                            </span>
                          </button>

                          <button
                            className={
                              styles.indicatorBtn + (mlCount > 0 ? ' ' + styles.active : '')
                            }
                            onClick={() => toggleIndicator(product.key, 'ML')}
                            title="Multi-line - Customers with multiple product lines"
                          >
                            <span className={styles.indicatorBadge + ' ' + styles.ml}>ML</span>
                            <span className={styles.indicatorCount}>
                              {mlCount}/{salesCount}
                            </span>
                          </button>
                        </div>
                      )}

                      <div
                        className={styles.premiumInputSection + ' ' + styles.compactPremiumInput}
                      >
                        <label className={styles.premiumInputLabel}>💰 Premium Amount:</label>
                        <div className={styles.premiumInputControls}>
                          <span className={styles.currencySymbol}>$</span>
                          <input
                            type="text"
                            className={styles.premiumInput}
                            value={getPremiumInputValue(product.key)}
                            onChange={(e) => handlePremiumInputChange(product.key, e.target.value)}
                            onFocus={() => handlePremiumInputFocus(product.key)}
                            onBlur={() => handlePremiumInputBlur(product.key)}
                            placeholder="0.00"
                            pattern="[0-9]*\.?[0-9]{0,2}"
                            maxLength={11}
                            inputMode="decimal"
                          />
                          {data[`${product.key}Premium` as keyof DailyRevenueData] >
                            99999999.99 && (
                            <span className={styles.premiumInputError}>Max $99,999,999.99</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                          <div
                            className={`${styles.progressFill} ${styles.withDynamicColor}`}
                            ref={(el) => {
                              if (el) {
                                el.style.width = `${progressPercentage}%`;
                                el.style.setProperty('--progress-color', product.color);
                              }
                            }}
                          />
                        </div>
                        <span
                          className={`${styles.progressText} ${styles.withDynamicColor}`}
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty('--progress-color', product.color);
                            }
                          }}
                        >
                          {salesCount} / {product.target} ({Math.round(progressPercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleSave}>
              <FontAwesomeIcon icon={faSave} />
              Save Revenue Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
