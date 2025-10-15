import { Role } from '@prisma/client';
import {
  faTachometerAlt,
  faCalendarDay,
  faCalendarWeek,
  faTasks,
  faHeadset,
  faHandshake,
  faUserTie,
  faQuestionCircle,
  faCommentDots,
  faQuoteLeft,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

export interface NavigationItem {
  path: string;
  label: string;
  icon: IconDefinition;
  isActive?: (pathname: string) => boolean;
  allowedRoles?: Role[];
}

export interface RoleConfiguration {
  type: string;
  displayName: string;
  color: string;
  icon: IconDefinition;
  navigation: NavigationItem[];
  dashboardConfig: {
    title: string;
    subtitle: string;
    description: string;
  };
  pageHeaders: {
    dailyActivity: {
      title: string;
      subtitle: string;
      description: string;
    };
    weeklyPerformance: {
      title: string;
      subtitle: string;
      description: string;
    };
    salesTasks: {
      title: string;
      subtitle: string;
      description: string;
    };
    reports?: {
      title: string;
      subtitle: string;
      description: string;
    };
  };
}

// Base navigation items that all roles share
const baseNavigation: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: faTachometerAlt,
    isActive: (pathname: string) => pathname === '/dashboard',
  },
];

// Role-specific configurations
export const ROLE_CONFIGS: Record<string, RoleConfiguration> = {
  [Role.ADMIN]: {
    type: 'admin',
    displayName: 'Administrator',
    color: '#0d6efd',
    icon: faUserTie,
    navigation: [
      ...baseNavigation,
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Executive Dashboard',
      subtitle: 'Organization-wide performance and system oversight',
      description:
        'Monitor all aspects of the organization, track system performance, and manage organizational settings',
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Activity Management',
        subtitle: 'All activities across the organization',
        description: 'Monitor and manage all activities across departments and teams',
      },
      weeklyPerformance: {
        title: 'Organizational Analytics',
        subtitle: 'Comprehensive organizational performance insights',
        description:
          'Advanced organizational analytics and metrics for strategic decision making and executive oversight',
      },
      salesTasks: {
        title: 'Task Management',
        subtitle: 'Organization-wide task assignment and tracking',
        description: 'Create, assign, and track tasks across all teams and departments',
      },
      reports: {
        title: 'Executive Analytics',
        subtitle: 'Comprehensive organizational reporting',
        description:
          'Comprehensive organizational reports, cross-departmental analytics, and strategic performance insights',
      },
    },
  },

  [Role.SALES_LEAD]: {
    type: 'sales_lead',
    displayName: 'Sales Team Lead',
    color: '#0d6efd',
    icon: faHandshake,
    navigation: [
      ...baseNavigation,
      {
        path: '/sales-tasks',
        label: 'My Tasks',
        icon: faTasks,
        isActive: (pathname: string) => pathname === '/sales-tasks',
      },
      {
        path: '/daily-activity',
        label: 'Sales Team Activity',
        icon: faCalendarDay,
        isActive: (pathname: string) => pathname === '/daily-activity',
      },
      {
        path: '/weekly-performance',
        label: 'Sales Team Performance',
        icon: faCalendarWeek,
        isActive: (pathname: string) => pathname === '/weekly-performance',
      },
      {
        path: '/quotes',
        label: 'Quote Log',
        icon: faQuoteLeft,
        isActive: (pathname: string) => pathname === '/quotes',
      },
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Sales Team Dashboard',
      subtitle: 'Sales team performance and revenue tracking',
      description:
        "Monitor your sales team's performance, track revenue goals, and identify coaching opportunities",
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Sales Team Activity',
        subtitle: 'Your sales team daily activities',
        description: 'Monitor and manage activities for agents assigned to you',
      },
      weeklyPerformance: {
        title: 'Sales Team Performance Analytics',
        subtitle: 'Comprehensive sales team performance insights',
        description:
          "Advanced analytics and metrics for your sales team's weekly performance and goal achievement",
      },
      salesTasks: {
        title: 'My Tasks & Activities',
        subtitle: 'Manage your personal tasks and activities',
        description: 'Create, track, and manage your personal tasks and follow-up activities',
      },
    },
  },

  [Role.SERVICE_LEAD]: {
    type: 'service_lead',
    displayName: 'Service Team Lead',
    color: '#198754',
    icon: faHeadset,
    navigation: [
      ...baseNavigation,
      {
        path: '/sales-tasks',
        label: 'My Tasks',
        icon: faTasks,
        isActive: (pathname: string) => pathname === '/sales-tasks',
      },
      {
        path: '/daily-activity',
        label: 'Service Team Activity',
        icon: faCalendarDay,
        isActive: (pathname: string) => pathname === '/daily-activity',
      },
      {
        path: '/weekly-performance',
        label: 'Service Team Performance',
        icon: faCalendarWeek,
        isActive: (pathname: string) => pathname === '/weekly-performance',
      },
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Service Team Dashboard',
      subtitle: 'Service team performance and customer satisfaction tracking',
      description:
        "Monitor your service team's performance, track customer satisfaction, and optimize service delivery",
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Service Team Activity',
        subtitle: 'Your service team daily activities',
        description: 'Monitor and manage activities for agents assigned to you',
      },
      weeklyPerformance: {
        title: 'Service Team Performance Analytics',
        subtitle: 'Comprehensive service team performance insights',
        description:
          "Advanced analytics and metrics for your service team's weekly performance and customer satisfaction",
      },
      salesTasks: {
        title: 'My Tasks & Activities',
        subtitle: 'Manage your personal tasks and activities',
        description: 'Create, track, and manage your personal tasks and follow-up activities',
      },
    },
  },

  [Role.SALES]: {
    type: 'sales',
    displayName: 'Sales Agent',
    color: '#fd7e14',
    icon: faHandshake,
    navigation: [
      ...baseNavigation,
      {
        path: '/sales-tasks',
        label: 'My Tasks',
        icon: faTasks,
        isActive: (pathname: string) => pathname === '/sales-tasks',
      },
      {
        path: '/daily-activity',
        label: 'Daily Sales Activity',
        icon: faCalendarDay,
        isActive: (pathname: string) => pathname === '/daily-activity',
      },
      {
        path: '/quotes',
        label: 'Quote Log',
        icon: faQuoteLeft,
        isActive: (pathname: string) => pathname === '/quotes',
      },
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Sales Dashboard',
      subtitle: 'Your sales performance and opportunities',
      description:
        'Track your personal sales performance, manage opportunities, and achieve your revenue goals',
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Daily Sales Activity',
        subtitle: 'Track your daily sales activities',
        description: 'Record and manage your calls, meetings, and client interactions',
      },
      weeklyPerformance: {
        title: 'Sales Performance Analytics',
        subtitle: 'Your personal sales performance insights',
        description:
          'Detailed analytics of your sales performance, goal progress, and opportunities for improvement',
      },
      salesTasks: {
        title: 'My Tasks & Activities',
        subtitle: 'Manage your personal tasks and activities',
        description: 'Create, track, and manage your personal tasks and follow-up activities',
      },
      reports: {
        title: 'Sales Reports',
        subtitle: 'Your personal sales analytics',
        description:
          'Personal sales reports and performance insights to help you achieve your goals',
      },
    },
  },

  [Role.SERVICE]: {
    type: 'service',
    displayName: 'Service Agent',
    color: '#20c997',
    icon: faHeadset,
    navigation: [
      ...baseNavigation,
      {
        path: '/sales-tasks',
        label: 'My Tasks',
        icon: faTasks,
        isActive: (pathname: string) => pathname === '/sales-tasks',
      },
      {
        path: '/daily-activity',
        label: 'Daily Service Activity',
        icon: faCalendarDay,
        isActive: (pathname: string) => pathname === '/daily-activity',
      },
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Service Dashboard',
      subtitle: 'Your service activities and customer support',
      description:
        'Track your service performance, manage customer requests, and deliver exceptional support',
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Daily Service Activity',
        subtitle: 'Track your daily service activities',
        description: 'Record and manage your customer interactions and service requests',
      },
      weeklyPerformance: {
        title: 'Service Performance Analytics',
        subtitle: 'Your personal service performance insights',
        description:
          'Detailed analytics of your service performance, customer satisfaction, and areas for improvement',
      },
      salesTasks: {
        title: 'My Tasks & Activities',
        subtitle: 'Manage your personal tasks and activities',
        description: 'Create, track, and manage your personal tasks and follow-up activities',
      },
      reports: {
        title: 'Service Reports',
        subtitle: 'Your personal service analytics',
        description:
          'Personal service reports and performance insights to help you deliver exceptional customer support',
      },
    },
  },

  [Role.OFFICE_MANAGER]: {
    type: 'office_manager',
    displayName: 'Office Manager',
    color: '#6f42c1',
    icon: faUserTie,
    navigation: [
      ...baseNavigation,
      {
        path: '/sales-tasks',
        label: 'My Tasks',
        icon: faTasks,
        isActive: (pathname: string) => pathname === '/sales-tasks',
      },
      {
        path: '/daily-activity',
        label: 'Office Activity',
        icon: faCalendarDay,
        isActive: (pathname: string) => pathname === '/daily-activity',
      },
      {
        path: '/weekly-performance',
        label: 'Office Performance',
        icon: faCalendarWeek,
        isActive: (pathname: string) => pathname === '/weekly-performance',
      },
      {
        path: '/feedback',
        label: 'Feedback',
        icon: faCommentDots,
        isActive: (pathname: string) => pathname === '/feedback',
      },
      {
        path: '/help',
        label: 'Help & Documentation',
        icon: faQuestionCircle,
        isActive: (pathname: string) => pathname === '/help',
      },
    ],
    dashboardConfig: {
      title: 'Office Dashboard',
      subtitle: 'Office management and administration',
      description:
        'Manage office operations, track staff activities, and oversee administrative functions',
    },
    pageHeaders: {
      dailyActivity: {
        title: 'Office Activity',
        subtitle: 'All office-related activities',
        description: 'View and manage activities across the office',
      },
      weeklyPerformance: {
        title: 'Office Performance Analytics',
        subtitle: 'Comprehensive office performance data',
        description: 'Review office-wide performance metrics and administrative efficiency',
      },
      salesTasks: {
        title: 'My Tasks & Activities',
        subtitle: 'Manage your personal tasks and activities',
        description: 'Create, track, and manage your personal tasks and follow-up activities',
      },
      reports: {
        title: 'Office Reports',
        subtitle: 'Office-wide analytics',
        description: 'Comprehensive office management reports and operational performance insights',
      },
    },
  },
};

// Helper functions
export const getRoleConfig = (role?: string): RoleConfiguration => {
  if (!role) {
    return ROLE_CONFIGS[Role.SALES]; // Default fallback
  }

  return ROLE_CONFIGS[role] || ROLE_CONFIGS[Role.SALES];
};

export const getNavigationForRole = (role?: string): NavigationItem[] => {
  const config = getRoleConfig(role);
  return config.navigation;
};

export const getPageHeaderForRole = (
  role?: string,
  page?: keyof RoleConfiguration['pageHeaders']
) => {
  const config = getRoleConfig(role);
  if (!page || !config.pageHeaders[page]) {
    return {
      title: 'Dashboard',
      subtitle: 'Welcome to your dashboard',
      description: 'Manage your activities and track your performance',
    };
  }
  return config.pageHeaders[page];
};

export const getDashboardConfigForRole = (role?: string) => {
  const config = getRoleConfig(role);
  return config.dashboardConfig;
};

export const isRoleAllowedForNavItem = (navItem: NavigationItem, userRole?: string): boolean => {
  if (!navItem.allowedRoles) return true;
  if (!userRole) return false;
  return navItem.allowedRoles.includes(userRole as Role);
};
