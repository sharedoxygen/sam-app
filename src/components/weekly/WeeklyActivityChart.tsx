import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Define color constants to match the business requirements
const METRIC_COLORS = {
  blue: 'rgba(13, 110, 253, 0.7)', // People Contacted
  teal: 'rgba(32, 201, 151, 0.7)', // Life Conversations
  green: 'rgba(25, 135, 84, 0.7)', // Sales
  orange: 'rgba(253, 126, 20, 0.7)', // Asking Ratio
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Business metrics will be defined by the business data from API

// Define the professional business metrics according to requirements
interface ActivityData {
  date: string;
  peopleContacted: number; // Blue (previously calls)
  lifeConversations: number; // Teal (previously meetings)
  sales: number; // Green (previously followUps)
  askingRatio: number; // Orange (previously emails)
  // Business focuses on Monday-Friday only
  dayOfWeek?: string;
}

interface WeeklyActivityChartProps {
  weekData: ActivityData[];
  title?: string;
}

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({
  weekData,
  title = 'Weekly Activity Distribution',
}) => {
  // Format the dates to show abbreviated day names
  const labels = weekData.map((day) => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'People Contacted',
        data: weekData.map((day) => day.peopleContacted),
        backgroundColor: METRIC_COLORS.blue, // Blue for contacts
      },
      {
        label: 'Life Conversations',
        data: weekData.map((day) => day.lifeConversations),
        backgroundColor: METRIC_COLORS.teal, // Teal for life conversations
      },
      {
        label: 'Sales',
        data: weekData.map((day) => day.sales),
        backgroundColor: METRIC_COLORS.green, // Green for sales
      },
      {
        label: 'Asking Ratio',
        data: weekData.map((day) => day.askingRatio),
        backgroundColor: METRIC_COLORS.orange, // Orange for asking ratio
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div>
      <Bar data={data} options={options} height={300} />
    </div>
  );
};

export default WeeklyActivityChart;
