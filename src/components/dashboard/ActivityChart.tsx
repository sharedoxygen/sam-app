'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faChartBar } from '@fortawesome/free-solid-svg-icons';
import styles from './ActivityChart.module.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define data structure for business metrics
type ActivityMetric = {
  day: string;
  peopleContacted: number;
  lifeConversations: number;
  sales: number;
  askingRatio: number;
};

// Define component props type with proper typing
type ActivityChartProps = {
  data?: ChartData<'bar'> | null; // Changed from 'line' to 'bar'
  title?: string;
};

export default function ActivityChart({ data, title = 'Weekly Activity' }: ActivityChartProps) {
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Default labels if no data
    datasets: [],
  });

  const [chartOptions, setChartOptions] = useState<ChartOptions<'bar'>>({});

  // Generate insights based on chart data
  const generateInsights = () => {
    if (!data || !data.datasets || data.datasets.length === 0) {
      return 'No activity data available for this period. Focus on consistent daily calling activity to build your pipeline.';
    }

    // Analyze the data for trends
    const salesData =
      (data.datasets.find((d) => d.label?.toLowerCase().includes('sales'))?.data as number[]) || [];
    const callsData =
      (data.datasets.find(
        (d) =>
          d.label?.toLowerCase().includes('dial') ||
          d.label?.toLowerCase().includes('call') ||
          d.label?.toLowerCase().includes('contacted')
      )?.data as number[]) || [];

    if (salesData.length === 0 && callsData.length === 0) {
      return 'Activity tracking shows opportunities for improvement in daily consistency and follow-through.';
    }

    // Calculate trends
    const totalSales = salesData.reduce((sum, val) => sum + (val || 0), 0);
    const totalCalls = callsData.reduce((sum, val) => sum + (val || 0), 0);
    const avgDailySales = totalSales / Math.max(salesData.length, 1);
    const avgDailyCalls = totalCalls / Math.max(callsData.length, 1);

    // Generate contextual insights
    if (totalSales > 0 && totalCalls > 0) {
      const conversionRate = (totalSales / totalCalls) * 100;
      if (conversionRate > 8) {
        return `Excellent performance with ${conversionRate.toFixed(1)}% conversion rate. Your consistent activity is generating outstanding results.`;
      } else if (conversionRate > 5) {
        return `Good activity levels showing ${conversionRate.toFixed(1)}% conversion. Focus on improving call quality and follow-up timing.`;
      } else {
        return `High activity volume detected. Consider improving qualification and presentation skills to boost conversion rate.`;
      }
    } else if (totalCalls > 0) {
      return `Active calling schedule shows ${Math.round(avgDailyCalls)} daily calls. Focus on converting more conversations to appointments and quotes.`;
    } else {
      return 'Opportunity to increase daily activity levels. Consistent outbound calling is key to building a strong sales pipeline.';
    }
  };

  useEffect(() => {
    // If external data is provided and valid, use it
    if (data && data.datasets && data.datasets.length > 0) {
      // Convert line chart data to bar chart format
      const barChartData = {
        ...data,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          // Enhanced bar styling with gradients and better colors
          backgroundColor: getBarColor(dataset.label || '', 0.8),
          borderColor: getBarColor(dataset.label || '', 1),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          // Remove line-specific properties
          tension: undefined,
          pointBackgroundColor: undefined,
          pointBorderColor: undefined,
          pointBorderWidth: undefined,
          pointRadius: undefined,
          pointHoverRadius: undefined,
        })),
      };
      setChartData(barChartData);
    } else {
      // Show empty chart if no data
      setChartData({
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        datasets: [
          {
            label: 'People Contacted',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(13, 110, 253, 0.8)',
            borderColor: '#0d6efd',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Life Conversations',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(32, 201, 151, 0.8)',
            borderColor: '#20c997',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Sales',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(25, 135, 84, 0.8)',
            borderColor: '#198754',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Quotes',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(253, 126, 20, 0.8)',
            borderColor: '#fd7e14',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      });
    }

    // Enhanced chart options for bar chart
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: 'bold',
            },
          },
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#4f46e5',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
              weight: 'bold',
            },
            color: '#6b7280',
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            precision: 0,
            font: {
              size: 11,
            },
            color: '#6b7280',
            callback: function (value) {
              return Number.isInteger(value) ? value : '';
            },
          },
        },
      },
      elements: {
        bar: {
          borderWidth: 2,
        },
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
    });
  }, [data]);

  // Helper function to get consistent colors for bars
  const getBarColor = (label: string, opacity: number = 0.8): string => {
    const colorMap: { [key: string]: string } = {
      'people contacted': `rgba(13, 110, 253, ${opacity})`,
      'life conversations': `rgba(32, 201, 151, ${opacity})`,
      sales: `rgba(25, 135, 84, ${opacity})`,
      quotes: `rgba(253, 126, 20, ${opacity})`,
      'asking ratio': `rgba(253, 126, 20, ${opacity})`,
      dials: `rgba(13, 110, 253, ${opacity})`,
    };

    const normalizedLabel = label.toLowerCase();
    for (const key in colorMap) {
      if (normalizedLabel.includes(key)) {
        return colorMap[key];
      }
    }

    // Default color if no match
    return `rgba(108, 117, 125, ${opacity})`;
  };

  return (
    <div className={styles.activityChartContainer}>
      <h3 className={styles.chartTitle}>
        <FontAwesomeIcon icon={faChartBar} className={styles.chartIcon} />
        {title}
      </h3>
      <div className={styles.chartWrapper}>
        <Bar options={chartOptions} data={chartData} />
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
