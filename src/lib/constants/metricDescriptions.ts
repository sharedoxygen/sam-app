export interface MetricDescription {
  title: string;
  shortDescription: string;
  detailedDescription: string;
  calculation?: string;
  example?: string;
  category: 'activity' | 'performance' | 'conversion' | 'indicator' | 'forecast' | 'revenue';
}

export const METRIC_DESCRIPTIONS: Record<string, MetricDescription> = {
  // Activity Metrics
  total_sales: {
    title: 'Total Sales',
    shortDescription: 'Number of policies closed and finalized',
    detailedDescription:
      'Complete sales transactions where policies have been issued and payments processed. This includes all product lines (Auto, Life/Health, Fire) across the selected time period.',
    calculation: 'Sum of all completed sales transactions',
    example:
      'If 5 auto policies, 3 life policies, and 2 fire policies were closed, Total Sales = 10',
    category: 'activity',
  },
  total_dials: {
    title: 'Total Dials',
    shortDescription: 'Number of outbound calls made to prospects and clients',
    detailedDescription:
      'All outbound calling activity including prospecting calls, follow-ups, and customer service calls. Essential for measuring daily activity levels and pipeline development.',
    calculation: 'Count of all outbound phone calls',
    example:
      'Morning prospecting (15) + afternoon follow-ups (10) + service calls (5) = 30 Total Dials',
    category: 'activity',
  },
  total_quotes: {
    title: 'Total Quotes',
    shortDescription: 'Number of insurance quotes generated and presented',
    detailedDescription:
      'Quotes created for prospects across all product lines. Represents opportunities in the pipeline that could convert to sales with proper follow-up.',
    calculation: 'Count of all quotes generated',
    example: 'Auto quotes (8) + Life quotes (4) + Fire quotes (3) = 15 Total Quotes',
    category: 'activity',
  },
  referrals: {
    title: 'Referrals',
    shortDescription: 'Referrals asked for and received from clients',
    detailedDescription:
      'Shows referral requests made to satisfied customers and new referrals received. Format shows "Asked/Received" to track both outbound requests and inbound referrals.',
    calculation: 'Referrals Asked / Referrals Received',
    example: 'Asked 12 clients for referrals, received 4 new leads = 12/4',
    category: 'activity',
  },

  // Performance Indicators
  raw_new: {
    title: 'Raw New (RN)',
    shortDescription: 'Customers with no prior insurance coverage',
    detailedDescription:
      'Sales to customers who have never had insurance coverage before. These are high-value prospects as they represent completely new business and often lead to additional product sales.',
    calculation: 'Count of sales marked with RN indicator',
    example: 'Out of 10 sales, 3 were to first-time insurance buyers = 3 RN (30%)',
    category: 'indicator',
  },
  multi_line: {
    title: 'Multi-line (ML)',
    shortDescription: 'Customers purchasing multiple insurance products',
    detailedDescription:
      'Sales involving customers who purchase more than one type of insurance (e.g., Auto + Life, or Auto + Home). Indicates successful cross-selling and higher customer value.',
    calculation: 'Count of sales marked with ML indicator',
    example: 'Customer buys Auto + Life insurance = 1 ML sale',
    category: 'indicator',
  },

  // Conversion Metrics
  dial_to_quote_rate: {
    title: 'Dial-to-Quote Rate',
    shortDescription: 'Percentage of calls that result in quotes',
    detailedDescription:
      'Measures calling efficiency by showing how often outbound calls convert to quote opportunities. Higher rates indicate effective prospecting and communication skills.',
    calculation: '(Total Quotes ÷ Total Dials) × 100',
    example: '15 quotes from 100 dials = 15% Dial-to-Quote Rate',
    category: 'conversion',
  },
  conversion_rate: {
    title: 'Conversion Rate',
    shortDescription: 'Percentage of quotes that become sales',
    detailedDescription:
      'Shows closing effectiveness by measuring how often quotes convert to actual sales. Critical metric for understanding sales skills and follow-up effectiveness.',
    calculation: '(Total Sales ÷ Total Quotes) × 100',
    example: '8 sales from 20 quotes = 40% Conversion Rate',
    category: 'conversion',
  },
  dial_to_sale_rate: {
    title: 'Dial-to-Sale Rate',
    shortDescription: 'Percentage of calls that result in sales',
    detailedDescription:
      'Overall efficiency metric showing the complete conversion funnel from initial call to closed sale. Combines prospecting and closing effectiveness.',
    calculation: '(Total Sales ÷ Total Dials) × 100',
    example: '8 sales from 100 dials = 8% Dial-to-Sale Rate',
    category: 'conversion',
  },

  // Performance Metrics
  people_contacted: {
    title: 'People Contacted',
    shortDescription: 'Number of meaningful conversations with prospects',
    detailedDescription:
      'Actual conversations held with prospects, excluding busy signals, voicemails, and wrong numbers. Measures quality contact activity rather than just dialing volume.',
    calculation: 'Count of successful contact conversations',
    example: '100 dials resulting in 25 actual conversations = 25 People Contacted',
    category: 'performance',
  },
  life_sales_conversations: {
    title: 'Life/Sales Conversations',
    shortDescription: 'In-depth discussions about insurance needs',
    detailedDescription:
      'Substantive conversations where insurance needs are discussed and solutions are presented. These go beyond initial contact to explore customer requirements.',
    calculation: 'Count of detailed needs assessment conversations',
    example: 'Brief contact (5) + detailed needs discussions (8) = 8 Life/Sales Conversations',
    category: 'performance',
  },
  referral_requests: {
    title: 'Referral Requests',
    shortDescription: 'Number of times referrals were requested',
    detailedDescription:
      'Proactive requests made to satisfied customers for referrals to friends, family, or colleagues. Essential for sustainable business growth.',
    calculation: 'Count of referral requests made to customers',
    example: 'Asked 5 customers after sales + 3 during service calls = 8 Referral Requests',
    category: 'performance',
  },

  // Forecast Metrics
  forecasted_sales: {
    title: 'Forecasted Sales',
    shortDescription: 'Projected sales for the period',
    detailedDescription:
      "Agent's prediction of sales they expect to close during the forecast period. Used for planning and performance tracking.",
    calculation: "Agent's projected sales count",
    example: 'Agent forecasts closing 12 sales this week based on pipeline',
    category: 'forecast',
  },
  forecasted_dials: {
    title: 'Forecasted Dials',
    shortDescription: 'Planned outbound calling activity',
    detailedDescription:
      'Target number of outbound calls the agent plans to make. Helps ensure adequate activity levels to meet sales goals.',
    calculation: "Agent's planned calling volume",
    example: 'Agent plans to make 150 calls this week to hit targets',
    category: 'forecast',
  },
  forecasted_quotes: {
    title: 'Forecasted Quotes',
    shortDescription: 'Expected number of quotes to generate',
    detailedDescription:
      'Projected quote volume based on planned activity and historical conversion rates. Indicates pipeline development expectations.',
    calculation: "Agent's projected quote generation",
    example: 'Expecting to generate 25 quotes from planned activity',
    category: 'forecast',
  },

  // Team Metrics
  team_performance: {
    title: 'Team Performance',
    shortDescription: 'Aggregate performance across team members',
    detailedDescription:
      'Combined metrics showing total team activity and results. Helps managers identify high performers and coaching opportunities.',
    calculation: 'Sum of individual team member metrics',
    example: 'Team of 5 agents with combined 50 sales, 200 quotes, 1000 dials',
    category: 'performance',
  },

  // Weekly Tracking
  weekly_target: {
    title: 'Weekly Target',
    shortDescription: 'Goal for the current week',
    detailedDescription:
      'Specific targets set for the week based on monthly/quarterly goals. Provides clear benchmarks for daily and weekly performance.',
    calculation: 'Predetermined target based on annual goals',
    example: 'Annual target of 500 sales ÷ 50 weeks = 10 sales per week target',
    category: 'forecast',
  },
  variance_to_target: {
    title: 'Variance to Target',
    shortDescription: 'Difference between actual and target performance',
    detailedDescription:
      'Shows whether performance is above or below expectations. Positive variance indicates exceeding targets, negative shows underperformance.',
    calculation: 'Actual Results - Target',
    example: '12 actual sales - 10 target = +2 variance (120% of target)',
    category: 'performance',
  },

  // Revenue Metrics
  premium_amount: {
    title: 'Premium Amount',
    shortDescription: 'Total premium revenue generated from insurance sales',
    detailedDescription:
      'The total dollar amount of insurance premiums sold during the period. This reflects the actual revenue value of policies written and directly correlates to business growth and agent performance.',
    calculation: 'Sum of all premium amounts from closed sales',
    example: '5 sales with premiums $500, $750, $1200, $300, $900 = $3,650 Premium Amount',
    category: 'revenue',
  },
};

// Helper function to get metric description by key
export const getMetricDescription = (key: string): MetricDescription | null => {
  const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '_');
  return METRIC_DESCRIPTIONS[normalizedKey] || null;
};

// Helper function to get description by title matching
export const getMetricDescriptionByTitle = (title: string): MetricDescription | null => {
  const normalizedTitle = title.toLowerCase();

  // Direct key matching first
  const directMatch = Object.entries(METRIC_DESCRIPTIONS).find(
    ([_, desc]) => desc.title.toLowerCase() === normalizedTitle
  );

  if (directMatch) return directMatch[1];

  // Partial matching for variations
  const partialMatch = Object.entries(METRIC_DESCRIPTIONS).find(
    ([_, desc]) =>
      normalizedTitle.includes(desc.title.toLowerCase()) ||
      desc.title.toLowerCase().includes(normalizedTitle)
  );

  return partialMatch ? partialMatch[1] : null;
};

// Helper to format description for tooltip
export const formatTooltipDescription = (
  description: MetricDescription,
  showCalculation: boolean = false
): string => {
  let tooltip = description.detailedDescription;

  if (showCalculation && description.calculation) {
    tooltip += `\n\nCalculation: ${description.calculation}`;
  }

  if (description.example) {
    tooltip += `\n\nExample: ${description.example}`;
  }

  return tooltip;
};
