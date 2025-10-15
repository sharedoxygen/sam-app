/**
 * Comprehensive API Type Definitions
 * Enterprise-grade type safety for all API interactions
 */

// Base entity types
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// User and Authentication types
export interface User extends BaseEntity {
  username: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES_LEAD' | 'SERVICE_LEAD' | 'SALES' | 'SERVICE';
  isActive: boolean;
  managerId?: number;
}

export interface AuthSession {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  expires: string;
}

// Task Management types
export interface Task extends BaseEntity {
  title: string;
  description: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  category?: 'sales' | 'service' | 'follow-up' | 'meeting' | 'call' | 'email';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  estimatedValue?: string;
  tags: string[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
  userId: number;
  user?: Pick<User, 'id' | 'name' | 'username'>;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  isCompleted?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  category?: 'sales' | 'service' | 'follow-up' | 'meeting' | 'call' | 'email';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  estimatedValue?: string;
  tags?: string[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  userId?: number;
}

// Enhanced Task types for UI (now redundant since Task includes all fields)
export interface EnhancedTask extends Task {
  // All enhanced fields are now part of the base Task interface
}

// Activity Management types
export interface Activity extends BaseEntity {
  type: string;
  clientName: string;
  duration: number;
  notes: string;
  date: string;
  time: string;
  insuranceType?: string;
  activityResult?: string;
  referralType?: string;
  userId: number;
}

export interface CreateActivityRequest {
  type: string;
  clientName: string;
  duration: number;
  notes: string;
  date: string;
  time: string;
  insuranceType?: string;
  activityResult?: string;
  referralType?: string;
}

// Metrics and Performance types
export interface DailySummary {
  date: string;
  dayOfWeek: string;
  peopleContacted: number;
  peopleWithLifeConversation: number;
  sales: number;
  askingRatio: number;
  quotesAuto: number;
  quotesLife: number;
  quotesFire: number;
  closedAuto: number;
  closedLife: number;
  closedFire: number;
  dials: number;
  referralsAsked: number;
  referralsReceived: number;
}

export interface WeeklyData {
  monday: DailySummary;
  tuesday: DailySummary;
  wednesday: DailySummary;
  thursday: DailySummary;
  friday: DailySummary;
}

export interface DashboardMetrics {
  today: {
    calls: number;
    meetings: number;
    followUps: number;
  };
  weekly: {
    sales: number;
    activities: number;
  };
  chartData: any[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface ActivitiesResponse {
  activities: Activity[];
}

export interface ActivityResponse {
  activity: Activity;
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Filter and Query types
export interface TaskFilters {
  userId?: number;
  status?: 'completed' | 'pending';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: 'overdue' | 'today' | 'week';
}

export interface ActivityFilters {
  date?: string;
  type?: string;
  userId?: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Theme and UI types
export type ThemeMode = 'default' | 'statefarm' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
}

// Utility types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Date utility types
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface WeekRange {
  weekStart: string;
  weekEnd: string;
  weekStartFormatted: string;
  weekEndFormatted: string;
}
