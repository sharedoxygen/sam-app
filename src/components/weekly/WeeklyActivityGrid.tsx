'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import styles from './WeeklyActivityGrid.module.css';

type WeeklyActivityData = {
  googleReviews: {
    asked: number;
    received: number;
  };
  opportunitiesWithoutTask: {
    start: number;
    finished: number;
  };
  weeklyAssignedList: {
    start: number;
    finished: number;
  };
};

type WeeklyTotals = {
  peopleTalkedTo: number;
  peoplePivoted: number;
  sales: number;
};

type WeeklyRatios = {
  askingRatio: number;
  closingRatio: number;
  conversationsPerSale: number;
};

type WeeklyActivityGridProps = {
  initialActivityData?: WeeklyActivityData;
  initialTotals?: WeeklyTotals;
  initialRatios?: WeeklyRatios;
  onActivityChange?: (data: WeeklyActivityData) => void;
  onTotalsChange?: (data: WeeklyTotals) => void;
  onRatiosChange?: (data: WeeklyRatios) => void;
  allowEdit?: boolean;
};

/**
 * Implements the weekly activity grid as shown in Image 3
 */
export default function WeeklyActivityGrid({
  initialActivityData,
  initialTotals,
  initialRatios,
  onActivityChange,
  onTotalsChange,
  onRatiosChange,
  allowEdit = true,
}: WeeklyActivityGridProps) {
  // Default empty data
  const defaultActivityData: WeeklyActivityData = {
    googleReviews: { asked: 0, received: 0 },
    opportunitiesWithoutTask: { start: 0, finished: 0 },
    weeklyAssignedList: { start: 0, finished: 0 },
  };

  const defaultTotals: WeeklyTotals = {
    peopleTalkedTo: 0,
    peoplePivoted: 0,
    sales: 0,
  };

  const defaultRatios: WeeklyRatios = {
    askingRatio: 0,
    closingRatio: 0,
    conversationsPerSale: 0,
  };

  // State for data
  const [activityData, setActivityData] = useState<WeeklyActivityData>(
    initialActivityData || defaultActivityData
  );
  const [totals, setTotals] = useState<WeeklyTotals>(initialTotals || defaultTotals);
  const [ratios, setRatios] = useState<WeeklyRatios>(initialRatios || defaultRatios);

  // Value changer component for cells with increment/decrement controls
  const ValueChanger = ({
    value,
    onChange,
    min = 0,
    max = 999,
  }: {
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
  }) => {
    const increment = () => {
      if (value < max) onChange(value + 1);
    };

    const decrement = () => {
      if (value > min) onChange(value - 1);
    };

    return (
      <div className={styles.valueChanger}>
        {allowEdit && (
          <button className={styles.btnControl} onClick={decrement} aria-label="Decrease value">
            <FontAwesomeIcon icon={faMinusCircle} />
          </button>
        )}
        <span className={styles.value}>{value}</span>
        {allowEdit && (
          <button className={styles.btnControl} onClick={increment} aria-label="Increase value">
            <FontAwesomeIcon icon={faPlusCircle} />
          </button>
        )}
      </div>
    );
  };

  // Calculate sales based on conversations and closing ratio
  const calculateSales = (conversations: number): number => {
    if (!ratios.closingRatio) return 0;
    return conversations * (ratios.closingRatio / 100);
  };

  // Handle activity data change
  const handleActivityChange = (
    category: keyof WeeklyActivityData,
    field: 'asked' | 'received' | 'start' | 'finished',
    value: number
  ) => {
    const newData = { ...activityData };

    // Type-safe approach for accessing fields
    if (category === 'googleReviews' && (field === 'asked' || field === 'received')) {
      newData.googleReviews[field] = value;
    } else if (
      category === 'opportunitiesWithoutTask' &&
      (field === 'start' || field === 'finished')
    ) {
      newData.opportunitiesWithoutTask[field] = value;
    } else if (category === 'weeklyAssignedList' && (field === 'start' || field === 'finished')) {
      newData.weeklyAssignedList[field] = value;
    }

    setActivityData(newData);
    if (onActivityChange) {
      onActivityChange(newData);
    }
  };

  // Handle totals change
  const handleTotalsChange = (field: keyof WeeklyTotals, value: number) => {
    const newTotals = { ...totals, [field]: value };
    setTotals(newTotals);
    if (onTotalsChange) {
      onTotalsChange(newTotals);
    }
  };

  // Handle ratios change
  const handleRatiosChange = (field: keyof WeeklyRatios, value: number) => {
    const newRatios = { ...ratios, [field]: value };
    setRatios(newRatios);
    if (onRatiosChange) {
      onRatiosChange(newRatios);
    }
  };

  return (
    <div className={styles.weeklyActivityGridContainer}>
      {/* Weekly Activity Table */}
      <div className={styles.weeklyActivityTable}>
        <h3>Weekly Activity</h3>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Asked</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.activityLabel}>Google Reviews</td>
              <td>
                <ValueChanger
                  value={activityData.googleReviews.asked}
                  onChange={(value) => handleActivityChange('googleReviews', 'asked', value)}
                />
              </td>
              <td>
                <ValueChanger
                  value={activityData.googleReviews.received}
                  onChange={(value) => handleActivityChange('googleReviews', 'received', value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className={styles.tableSpaced}>
          <thead>
            <tr>
              <th></th>
              <th>Start</th>
              <th>Finished</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.activityLabel}>Opportunities without Task</td>
              <td>
                <ValueChanger
                  value={activityData.opportunitiesWithoutTask.start}
                  onChange={(value) =>
                    handleActivityChange('opportunitiesWithoutTask', 'start', value)
                  }
                />
              </td>
              <td>
                <ValueChanger
                  value={activityData.opportunitiesWithoutTask.finished}
                  onChange={(value) =>
                    handleActivityChange('opportunitiesWithoutTask', 'finished', value)
                  }
                />
              </td>
            </tr>
            <tr>
              <td className={styles.activityLabel}>Weekly Assigned List</td>
              <td>
                <ValueChanger
                  value={activityData.weeklyAssignedList.start}
                  onChange={(value) => handleActivityChange('weeklyAssignedList', 'start', value)}
                />
              </td>
              <td>
                <ValueChanger
                  value={activityData.weeklyAssignedList.finished}
                  onChange={(value) =>
                    handleActivityChange('weeklyAssignedList', 'finished', value)
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weekly Totals Table */}
      <div className={styles.weeklyTotalsTable}>
        <h3>Weekly Totals</h3>
        <table>
          <thead>
            <tr>
              <th>People Talked To</th>
              <th>People Pivoted</th>
              <th>Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <ValueChanger
                  value={totals.peopleTalkedTo}
                  onChange={(value) => handleTotalsChange('peopleTalkedTo', value)}
                />
              </td>
              <td>
                <ValueChanger
                  value={totals.peoplePivoted}
                  onChange={(value) => handleTotalsChange('peoplePivoted', value)}
                />
              </td>
              <td>
                <ValueChanger
                  value={totals.sales}
                  onChange={(value) => handleTotalsChange('sales', value)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weekly Ratios Table */}
      <div className={styles.weeklyRatiosTable}>
        <h3>Weekly Ratios</h3>
        <table>
          <thead>
            <tr>
              <th>Asking Ratio</th>
              <th>Closing Ratio</th>
              <th>Conversations per Sale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <ValueChanger
                  value={ratios.askingRatio}
                  onChange={(value) => handleRatiosChange('askingRatio', value)}
                  max={100}
                />
              </td>
              <td>
                <ValueChanger
                  value={ratios.closingRatio}
                  onChange={(value) => handleRatiosChange('closingRatio', value)}
                  max={100}
                />
              </td>
              <td>
                <ValueChanger
                  value={ratios.conversationsPerSale}
                  onChange={(value) => handleRatiosChange('conversationsPerSale', value)}
                  max={50}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
