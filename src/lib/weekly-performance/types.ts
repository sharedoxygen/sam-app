export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Weekly performance data structure
export type WeeklyMetrics = {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
  rawNew?: number; // Raw New indicator count
  multiLine?: number; // Multi-line indicator count
  premiumAmount?: number; // Total premium revenue amount
};

export type AgentPerformance = {
  userId: string;
  userName: string;
  userRole: string;
  forecast: WeeklyMetrics;
  actual: WeeklyMetrics;
  performanceMetrics: {
    peopleContacted: { actual: number; forecast: number; percentage: number; variance: number };
    lifeSalesConversations: {
      actual: number;
      forecast: number;
      percentage: number;
      variance: number;
    };
    sales: { actual: number; forecast: number; percentage: number; variance: number };
    referralRequests: { actual: number; forecast: number; percentage: number; variance: number };
    premiumAmount: { actual: number; forecast: number; percentage: number; variance: number };
  };
};

export type TeamPerformance = {
  teamSummary: WeeklyMetrics & { totalAgents: number };
  agents: AgentPerformance[];
};

export type ViewMode = 'forecast' | 'actual' | 'comparison';
export type TeamViewMode = 'team' | 'forecast' | 'comparison';
export type CurrentView = 'personal' | 'team';

export type DateRange = {
  startDate: string;
  endDate: string;
  startDateShort: string;
  endDateShort: string;
  weekStartDate: string;
  weekEndDate: string;
};

export type AccessLevel = 'none' | 'individual' | 'team' | 'all';
