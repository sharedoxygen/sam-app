'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import styles from './RevenueGenerationModal.module.css';

type WeeklyRevenueData = {
  [productLine: string]: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
};

type RevenueGenerationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WeeklyRevenueData) => void;
  initialData?: WeeklyRevenueData;
};

const PRODUCT_LINES = [
  { key: 'automotive', label: 'AUTOMOTIVE INSURANCE' },
  { key: 'lifeHealth', label: 'LIFE & HEALTH INSURANCE' },
  { key: 'propertyFire', label: 'PROPERTY & FIRE INSURANCE' },
];

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
];

export default function RevenueGenerationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: RevenueGenerationModalProps) {
  const [data, setData] = useState<WeeklyRevenueData>(() => {
    const emptyData: WeeklyRevenueData = {};
    PRODUCT_LINES.forEach((product) => {
      emptyData[product.key] = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
      };
    });
    return emptyData;
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const updateValue = (productLine: string, day: string, value: number) => {
    setData((prev) => ({
      ...prev,
      [productLine]: {
        ...prev[productLine],
        [day]: Math.max(0, value),
      },
    }));
  };

  const increment = (productLine: string, day: string) => {
    const productData = data[productLine];
    const currentValue = productData ? (productData as any)[day] || 0 : 0;
    updateValue(productLine, day, currentValue + 1);
  };

  const decrement = (productLine: string, day: string) => {
    const productData = data[productLine];
    const currentValue = productData ? (productData as any)[day] || 0 : 0;
    updateValue(productLine, day, Math.max(0, currentValue - 1));
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const getTotalForProduct = (productLine: string) => {
    const productData = data[productLine];
    if (!productData) return 0;
    return Object.values(productData).reduce((sum, value) => sum + value, 0);
  };

  const getTotalForDay = (day: string) => {
    return PRODUCT_LINES.reduce((sum, product) => {
      const productData = data[product.key];
      const value = productData ? (productData as any)[day] || 0 : 0;
      return sum + value;
    }, 0);
  };

  const getGrandTotal = () => {
    return PRODUCT_LINES.reduce((sum, product) => sum + getTotalForProduct(product.key), 0);
  };

  // Get formatted current date
  const getCurrentWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(today.setDate(diff));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${monthNames[friday.getMonth()]} ${friday.getDate()}, ${friday.getFullYear()}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Revenue Generation</h2>
              <p className={styles.modalSubtitle}>Closed Sales by Product Line</p>
              <p className={styles.modalDate}>{getCurrentWeekRange()}</p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.revenueGrid}>
              {PRODUCT_LINES.map((product) => (
                <div key={product.key} className={styles.productSection}>
                  <h3 className={styles.productTitle}>{product.label}</h3>

                  <div className={styles.daysGrid}>
                    {DAYS.map((day) => (
                      <div key={day.key} className={styles.dayColumn}>
                        <div className={styles.dayHeader}>{day.label}</div>
                        <div className={styles.valueControls}>
                          <button
                            className={`${styles.controlBtn} ${styles.decrement}`}
                            onClick={() => decrement(product.key, day.key)}
                          >
                            −
                          </button>
                          <div className={styles.valueDisplay}>
                            {data[product.key] ? (data[product.key] as any)[day.key] || 0 : 0}
                          </div>
                          <button
                            className={`${styles.controlBtn} ${styles.increment}`}
                            onClick={() => increment(product.key, day.key)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className={styles.totalColumn}>
                      <div className={styles.dayHeader}>TOTAL</div>
                      <div className={styles.totalDisplay}>{getTotalForProduct(product.key)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Weekly Totals Row */}
              <div className={styles.weeklyTotals}>
                <h3 className={styles.productTitle}>WEEKLY TOTALS</h3>
                <div className={styles.daysGrid}>
                  {DAYS.map((day) => (
                    <div key={day.key} className={styles.dayColumn}>
                      <div className={styles.dayHeader}>{day.label}</div>
                      <div className={styles.totalDisplay}>{getTotalForDay(day.key)}</div>
                    </div>
                  ))}
                  <div className={styles.totalColumn}>
                    <div className={styles.dayHeader}>TOTAL</div>
                    <div className={styles.grandTotalDisplay}>{getGrandTotal()}</div>
                  </div>
                </div>
              </div>
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
