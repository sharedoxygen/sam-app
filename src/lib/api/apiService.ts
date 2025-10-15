/**
 * Centralized API service for all API calls
 * Enterprise-grade API service with comprehensive error handling and type safety
 */

import {
  Activity,
  Task,
  DailySummary,
  WeeklyData,
  DashboardMetrics,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateActivityRequest,
} from '@/types/api';

// Re-export types for backward compatibility
export type {
  Activity,
  Task,
  DailySummary,
  WeeklyData,
  DashboardMetrics,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateActivityRequest,
};

// Event emitter for data refresh notifications
class DataRefreshEmitter extends EventTarget {
  emit(eventType: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(eventType, { detail }));
  }
}

// Create global event emitter instance
export const dataRefreshEmitter = new DataRefreshEmitter();

// Event types
export const DATA_EVENTS = {
  USER_UPDATED: 'user-updated',
  USER_CREATED: 'user-created',
  USER_DELETED: 'user-deleted',
  ACTIVITY_UPDATED: 'activity-updated',
  ACTIVITY_CREATED: 'activity-created',
  ACTIVITY_DELETED: 'activity-deleted',
  TASK_UPDATED: 'task-updated',
  TASK_CREATED: 'task-created',
  TASK_DELETED: 'task-deleted',
  CLIENT_UPDATED: 'client-updated',
  CLIENT_CREATED: 'client-created',
  CLIENT_DELETED: 'client-deleted',
  DATA_REFRESH_NEEDED: 'data-refresh-needed',
} as const;

// User type definition
export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  managerId?: number;
  manager?: {
    id: number;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Client type definition
export interface Client {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define default date ranges
const getDateRanges = () => {
  const today = new Date();

  // Start of day
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  // End of day
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDay = today.getDay();

  // Calculate Monday of current week
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate Friday of current week
  const fridayOffset = currentDay === 0 ? -2 : 5 - currentDay;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + fridayOffset);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
    startOfWeek: startOfWeek.toISOString(),
    endOfWeek: endOfWeek.toISOString(),
  };
};

/**
 * Core API request handler with consistent error handling
 * @template T - The expected return type of the API request
 */
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Enhanced error handling with better feedback
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails = '';

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorDetails = errorData.details || '';
      } catch (jsonError) {
        // If response is not JSON, try to get text
        try {
          const textError = await response.text();
          if (textError) {
            errorDetails = textError;
          }
        } catch (textParseError) {
          console.error('Failed to parse error response:', textParseError);
        }
      }

      // Create comprehensive error object
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).statusText = response.statusText;
      (apiError as any).details = errorDetails;
      (apiError as any).endpoint = endpoint;

      console.error(`API Request Failed:`, {
        endpoint,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorDetails,
      });

      throw apiError;
    }

    return await response.json();
  } catch (error) {
    // Enhanced error logging
    if (error instanceof Error) {
      console.error(`API Request Error (${endpoint}):`, {
        message: error.message,
        stack: error.stack,
        endpoint,
        method: options.method || 'GET',
      });
    } else {
      console.error(`Unknown API Error (${endpoint}):`, error);
    }

    // Re-throw to let the component handle the error
    throw error;
  }
};

/**
 * User API Methods
 */
export const UserApi = {
  // Get all users
  getUsers: async (): Promise<User[]> => {
    try {
      return await apiRequest<User[]>('/api/users');
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Get single user
  getUser: async (id: number): Promise<User | null> => {
    try {
      return await apiRequest<User>(`/api/users/${id}`);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  // Create user
  createUser: async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'manager'> & { password: string }
  ): Promise<User> => {
    const user = await apiRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.USER_CREATED, { user });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return user;
  },

  // Update user
  updateUser: async (
    id: number,
    userData: Partial<User> & { password?: string }
  ): Promise<User> => {
    const user = await apiRequest<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.USER_UPDATED, { user });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return user;
  },

  // Delete user
  deleteUser: async (id: number): Promise<void> => {
    await apiRequest(`/api/users/${id}`, {
      method: 'DELETE',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.USER_DELETED, { userId: id });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
  },

  // Get team members
  getTeamMembers: async (): Promise<{ users: User[] }> => {
    try {
      return await apiRequest<{ users: User[] }>('/api/users/team');
    } catch (error) {
      console.error('Error fetching team members:', error);
      return { users: [] };
    }
  },
};

/**
 * Client API Methods
 */
export const ClientApi = {
  // Get all clients
  getClients: async (): Promise<Client[]> => {
    try {
      return await apiRequest<Client[]>('/api/clients');
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  },

  // Create client
  createClient: async (
    clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client> => {
    const client = await apiRequest<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.CLIENT_CREATED, { client });
    return client;
  },

  // Update client
  updateClient: async (id: number, clientData: Partial<Client>): Promise<Client> => {
    const client = await apiRequest<Client>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(clientData),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.CLIENT_UPDATED, { client });
    return client;
  },

  // Delete client
  deleteClient: async (id: number): Promise<void> => {
    await apiRequest(`/api/clients/${id}`, {
      method: 'DELETE',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.CLIENT_DELETED, { clientId: id });
  },
};

/**
 * Activity API Methods
 */
export const ActivityApi = {
  // Get activities for a specific date (weekday focus) or all activities if no date
  getActivities: async (date?: string): Promise<Activity[]> => {
    try {
      let endpoint = '/api/activities?limit=1000';
      if (date) {
        const params = new URLSearchParams({ date });
        endpoint = `/api/activities?${params.toString()}`;
      }

      const response = await apiRequest<{ activities: Activity[] }>(endpoint);
      return response.activities || [];
    } catch (error) {
      console.error('Error fetching agent activities:', error);
      // Return empty array as fallback
      return [];
    }
  },

  // Create a new activity
  createActivity: async (activity: Omit<Activity, 'id'>): Promise<Activity> => {
    const newActivity = await apiRequest<Activity>('/api/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.ACTIVITY_CREATED, { activity: newActivity });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return newActivity;
  },

  // Update an existing activity
  updateActivity: async (id: number, activity: Partial<Activity>): Promise<Activity> => {
    const updatedActivity = await apiRequest<Activity>(`/api/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(activity),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.ACTIVITY_UPDATED, { activity: updatedActivity });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return updatedActivity;
  },

  // Delete an activity
  deleteActivity: async (id: number): Promise<void> => {
    await apiRequest(`/api/activities/${id}`, {
      method: 'DELETE',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.ACTIVITY_DELETED, { activityId: id });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
  },
};

/**
 * Metrics API Methods
 */
export const MetricsApi = {
  // Get dashboard metrics for today
  getDashboardMetrics: async () => {
    try {
      const { startOfDay, endOfDay, startOfWeek, endOfWeek } = getDateRanges();

      // Build parameters for today's metrics
      const todayParams = new URLSearchParams({
        startDate: startOfDay,
        endDate: endOfDay,
      });

      // Build parameters for weekly metrics
      const weeklyParams = new URLSearchParams({
        startDate: startOfWeek,
        endDate: endOfWeek,
      });

      // Define expected response type structures
      type MetricsResponse = {
        summary?: {
          totals?: {
            calls: number;
            meetings: number;
            followUps: number;
          };
          totalActivities?: number;
        };
        chartData?: any[];
      };

      // Fetch metrics data for today and this week in parallel
      const [todayResponse, weeklyResponse] = await Promise.all([
        apiRequest<MetricsResponse>(`/api/metrics?${todayParams.toString()}`),
        apiRequest<MetricsResponse>(`/api/metrics?${weeklyParams.toString()}`),
      ]);

      // Process API responses with proper typing
      const todayCalls = todayResponse.summary?.totals?.calls || 0;
      const todayMeetings = todayResponse.summary?.totals?.meetings || 0;
      const followUps = todayResponse.summary?.totals?.followUps || 0;

      // Calculate weekly sales (this would normally come from a sales API endpoint)
      const weeklyActivities = weeklyResponse.summary?.totalActivities || 0;
      const weeklySales = Math.round(weeklyActivities * 0.05); // Estimate 5% conversion rate

      return {
        today: {
          calls: todayCalls,
          meetings: todayMeetings,
          followUps: followUps,
        },
        weekly: {
          sales: weeklySales,
          activities: weeklyActivities,
        },
        chartData: weeklyResponse.chartData || [],
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return empty data as fallback (no mock data)
      return {
        today: {
          calls: 0,
          meetings: 0,
          followUps: 0,
        },
        weekly: {
          sales: 0,
          activities: 0,
        },
        chartData: [],
      };
    }
  },

  // Get daily summary for a specific date (business day focused)
  getDailySummary: async (date: string): Promise<DailySummary> => {
    try {
      const params = new URLSearchParams({ date });
      return await apiRequest<DailySummary>(`/api/metrics/daily-summary?${params.toString()}`);
    } catch (error) {
      console.error('Error fetching agent daily summary:', error);
      // Return empty summary as fallback (no mock data)
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      return {
        date,
        dayOfWeek,
        peopleContacted: 0,
        peopleWithLifeConversation: 0,
        sales: 0,
        askingRatio: 0,
        quotesAuto: 0,
        quotesLife: 0,
        quotesFire: 0,
        closedAuto: 0,
        closedLife: 0,
        closedFire: 0,
        dials: 0,
        referralsAsked: 0,
        referralsReceived: 0,
      };
    }
  },

  // Get weekly summary for a specific week
  getWeeklySummary: async (weekStartDate: string): Promise<WeeklyData> => {
    try {
      const params = new URLSearchParams({ weekStartDate });
      return await apiRequest(`/api/metrics/weekly-summary?${params.toString()}`);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);

      // Return default empty weekly data as fallback
      const emptyDay = (day: string): DailySummary => ({
        date: '',
        dayOfWeek: day,
        peopleContacted: 0,
        peopleWithLifeConversation: 0,
        sales: 0,
        askingRatio: 0,
        quotesAuto: 0,
        quotesLife: 0,
        quotesFire: 0,
        closedAuto: 0,
        closedLife: 0,
        closedFire: 0,
        dials: 0,
        referralsAsked: 0,
        referralsReceived: 0,
      });

      return {
        monday: emptyDay('Monday'),
        tuesday: emptyDay('Tuesday'),
        wednesday: emptyDay('Wednesday'),
        thursday: emptyDay('Thursday'),
        friday: emptyDay('Friday'),
      };
    }
  },

  // Update daily summary for a specific date (used for direct metric entry)
  updateDailySummary: async (
    date: string,
    summary: Partial<DailySummary>
  ): Promise<DailySummary> => {
    return apiRequest(`/api/metrics/daily-summary`, {
      method: 'PUT',
      body: JSON.stringify({ date, ...summary }),
    });
  },
};

/**
 * Tasks API Methods
 */
export const TasksApi = {
  // Get all tasks
  getTasks: async (): Promise<Task[]> => {
    try {
      const response = await apiRequest<{ tasks: Task[] }>('/api/tasks');
      return response.tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Return empty array as fallback
      return [];
    }
  },

  // Create a new task
  createTask: async (task: CreateTaskRequest): Promise<Task> => {
    const response = await apiRequest<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.TASK_CREATED, { task: response.task });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return response.task;
  },

  // Update an existing task
  updateTask: async (id: number, task: UpdateTaskRequest): Promise<Task> => {
    const response = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(task),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.TASK_UPDATED, { task: response.task });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return response.task;
  },

  // Delete a task
  deleteTask: async (id: number): Promise<void> => {
    await apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.TASK_DELETED, { taskId: id });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
  },
};

// Quote type definitions
export interface QuoteRequest {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  insuranceType: 'AUTO' | 'LIFE_HEALTH' | 'PROPERTY_FIRE';
  premium: number;
  description: string;
  validUntil: string;
  notes?: string;
}

export interface Quote {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  insuranceType: 'AUTO' | 'LIFE_HEALTH' | 'PROPERTY_FIRE';
  premium: number;
  description: string;
  validUntil: string;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  quoteDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Quotes API Methods
 */
export const QuotesApi = {
  // Get all quotes
  getQuotes: async (): Promise<Quote[]> => {
    try {
      const response = await apiRequest<{ quotes: Quote[] }>('/api/quotes');
      return response.quotes || [];
    } catch (error) {
      console.error('Error fetching quotes:', error);
      return [];
    }
  },

  // Create a new quote
  createQuote: async (quoteData: QuoteRequest): Promise<Quote> => {
    const response = await apiRequest<Quote>('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(quoteData),
      credentials: 'include',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return response;
  },

  // Update a quote
  updateQuote: async (id: string, quoteData: Partial<QuoteRequest>): Promise<Quote> => {
    const response = await apiRequest<Quote>(`/api/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(quoteData),
      credentials: 'include',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return response;
  },

  // Delete a quote
  deleteQuote: async (id: string): Promise<void> => {
    await apiRequest(`/api/quotes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
  },
};

/**
 * Weekly Activities API Methods
 */
export const WeeklyActivityApi = {
  // Get weekly activities
  getWeeklyActivities: async (date: string, userId?: string): Promise<any> => {
    try {
      const params = new URLSearchParams({ date });
      if (userId) params.append('userId', userId);

      return await apiRequest(`/api/weekly-activities?${params.toString()}`);
    } catch (error) {
      console.error('Error fetching weekly activities:', error);
      return null;
    }
  },

  // Save weekly activities
  saveWeeklyActivities: async (data: any): Promise<any> => {
    const result = await apiRequest('/api/weekly-activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    dataRefreshEmitter.emit(DATA_EVENTS.DATA_REFRESH_NEEDED);
    return result;
  },
};

// Export date utility functions
export const DateUtils = {
  // Format date for display
  formatDate: (date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'medium':
      default:
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
    }
  },

  // Get week dates (start and end) with an optional offset
  getWeekDates: (offset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday

    const weekStart = new Date(now);
    weekStart.setDate(diff + offset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday (4 days after Monday)
    weekEnd.setHours(23, 59, 59, 999);

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekStartFormatted: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekEndFormatted: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  },
};
