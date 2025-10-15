'use client';

import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faPieChart } from '@fortawesome/free-solid-svg-icons';
import styles from './DistributionChart.module.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define component props type
type DistributionChartProps = {
  data?: ChartData<'doughnut'>;
  title?: string;
};

export default function DistributionChart({
  data,
  title = 'Activity Distribution',
}: DistributionChartProps) {
  const [chartOptions, setChartOptions] = useState({});

  // Generate insights based on distribution data
  const generateInsights = () => {
    if (!data || !data.datasets || data.datasets.length === 0 || !data.datasets[0].data) {
      return 'No distribution data available. Focus on balanced activity across all areas: calls, quotes, sales, and referrals.';
    }

    const dataValues = data.datasets[0].data as number[];
    const labels = (data.labels as string[]) || [];
    const total = dataValues.reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      return 'Start building activity across all areas. Consistent daily effort in calling, quoting, and follow-up drives results.';
    }

    // Analyze distribution patterns
    const maxValue = Math.max(...dataValues);
    const maxIndex = dataValues.indexOf(maxValue);
    const maxCategory = labels[maxIndex] || 'activity';

    // Calculate percentages
    const percentages = dataValues.map((val) => (val / total) * 100);

    // Find imbalances
    if (percentages[0] > 70) {
      // Too much emphasis on calls
      return `High calling volume (${percentages[0].toFixed(0)}%) shows good activity. Focus on converting more calls to quotes and sales.`;
    } else if (percentages[1] > 50) {
      // High quote percentage
      return `Strong quote generation (${percentages[1].toFixed(0)}% of activity). Work on improving conversion rate to close more sales.`;
    } else if (percentages[2] > 30) {
      // High sales percentage
      return `Excellent closing performance with ${percentages[2].toFixed(0)}% sales conversion. This is a well-balanced, high-performing activity mix.`;
    } else if (percentages.slice(3).some((p) => p > 20)) {
      // High referral activity
      return `Strong referral activity detected. Great job building relationships - this sustainable approach will drive long-term growth.`;
    } else {
      return `Balanced activity distribution across ${labels.length} areas. Maintain consistency while focusing on areas with highest conversion potential.`;
    }
  };

  useEffect(() => {
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
      },
    });
  }, []);

  // Default empty chart
  const emptyData = {
    labels: ['Client Contacts', 'Quotes Generated', 'Closed Sales', 'Referrals Asked'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#0d6efd', '#20c997', '#198754', '#fd7e14'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={styles.distributionChartContainer}>
      <h3 className={styles.chartTitle}>
        <FontAwesomeIcon icon={faPieChart} />
        {title}
      </h3>
      <div className={styles.chartWrapper}>
        <Doughnut options={chartOptions} data={data || emptyData} />
      </div>

      {/* Add insights section */}
      <div className={styles.chartInsights}>
        <div className={styles.insightText}>
          <FontAwesomeIcon icon={faLightbulb} />
          {generateInsights()}
        </div>
      </div>
    </div>
  );
}
