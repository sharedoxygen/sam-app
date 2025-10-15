import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic';

// Weekly metrics data structure
type WeeklyMetrics = {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
  rawNew?: number; // Raw New indicator count
  multiLine?: number; // Multi-line indicator count
};

type AgentPerformance = {
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
  };
};

type TeamPerformance = {
  teamSummary: WeeklyMetrics & { totalAgents: number };
  agents: AgentPerformance[];
};

// Daily activity data structure
type DayActivities = {
  closed: {
    auto: number;
    lifeHealth: number;
    fire: number;
    // Indicator counts for closed sales
    autoRawNew?: number;
    autoMultiLine?: number;
    lifeHealthRawNew?: number;
    lifeHealthMultiLine?: number;
    fireRawNew?: number;
    fireMultiLine?: number;
  };
  quotes: number;
  quotesRawNew?: number; // Quotes that were Raw New
  quotesMultiLine?: number; // Quotes that were Multi-line
  dials: number;
  referrals: {
    ask: number;
    received: number;
  };
  rawNew: number; // Raw New (RN) indicator
  multiLine: number; // Multi-line indicator
};

type WeeklyActivityData = {
  monday: DayActivities;
  tuesday: DayActivities;
  wednesday: DayActivities;
  thursday: DayActivities;
  friday: DayActivities;
};

// Helper function to get week start date (Monday)
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function to calculate weekly metrics from daily activities
function calculateWeeklyActuals(weeklyData: WeeklyActivityData): WeeklyMetrics {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

  let peopleContacted = 0;
  let lifeSalesConversations = 0;
  let sales = 0;
  let referralRequests = 0;
  let rawNew = 0;
  let multiLine = 0;

  for (const day of days) {
    const dayData = weeklyData[day];

    if (dayData) {
      // People contacted = dials
      peopleContacted += dayData.dials || 0;

      // Life sales conversations = life/health sales + quotes * 0.3
      lifeSalesConversations +=
        (dayData.closed?.lifeHealth || 0) + Math.round((dayData.quotes || 0) * 0.3);

      // Total sales = all closed sales
      sales +=
        (dayData.closed?.auto || 0) +
        (dayData.closed?.lifeHealth || 0) +
        (dayData.closed?.fire || 0);

      // Count Raw New indicators from closed sales
      rawNew +=
        (dayData.closed?.autoRawNew || 0) +
        (dayData.closed?.lifeHealthRawNew || 0) +
        (dayData.closed?.fireRawNew || 0);

      // Count Multi-line indicators from closed sales
      multiLine +=
        (dayData.closed?.autoMultiLine || 0) +
        (dayData.closed?.lifeHealthMultiLine || 0) +
        (dayData.closed?.fireMultiLine || 0);

      // Also add RN/ML from quotes
      rawNew += dayData.quotesRawNew || 0;
      multiLine += dayData.quotesMultiLine || 0;

      // Referral requests = referrals asked
      referralRequests += dayData.referrals?.ask || 0;
    }
  }

  return {
    peopleContacted,
    lifeSalesConversations,
    sales,
    referralRequests,
    rawNew,
    multiLine,
  };
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(actual: WeeklyMetrics, forecast: WeeklyMetrics) {
  const calculateMetric = (actualValue: number, forecastValue: number) => ({
    actual: actualValue,
    forecast: forecastValue,
    percentage: forecastValue === 0 ? 0 : Math.round((actualValue / forecastValue) * 100),
    variance: actualValue - forecastValue,
  });

  return {
    peopleContacted: calculateMetric(actual.peopleContacted, forecast.peopleContacted),
    lifeSalesConversations: calculateMetric(
      actual.lifeSalesConversations,
      forecast.lifeSalesConversations
    ),
    sales: calculateMetric(actual.sales, forecast.sales),
    referralRequests: calculateMetric(actual.referralRequests, forecast.referralRequests),
  };
}

// GET /api/weekly-performance/team - Get team performance data for managers
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserRole = session.user.role;

  const { searchParams } = new URL(request.url);
  const weekStartDateParam = searchParams.get('weekStartDate');
  const managerId = searchParams.get('managerId');
  let effectiveManagerId = managerId;

  if (!effectiveManagerId) {
    effectiveManagerId = sessionUserId;
  }

  if (sessionUserRole !== 'ADMIN' && sessionUserRole !== 'OFFICE_MANAGER') {
    if (managerId && managerId !== effectiveManagerId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot query for other manager IDs.' },
        { status: 403 }
      );
    }
  }

  if (!weekStartDateParam) {
    return NextResponse.json({ error: 'Week start date required' }, { status: 400 });
  }

  const weekStart = new Date(weekStartDateParam);
  const weekStartUTC = new Date(
    Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  let teamMemberIds: number[] = [];
  const managerIdInt = parseInt(effectiveManagerId);

  if (isNaN(managerIdInt)) {
    return NextResponse.json({ error: 'Invalid manager ID' }, { status: 400 });
  }

  if (
    sessionUserRole === 'ADMIN' ||
    sessionUserRole === 'OFFICE_MANAGER' ||
    sessionUserRole === 'SALES_LEAD' ||
    sessionUserRole === 'SERVICE_LEAD'
  ) {
    // Role-based team member filtering
    if (sessionUserRole === 'ADMIN' || sessionUserRole === 'OFFICE_MANAGER') {
      // Admin and Office Manager see organization-wide data
      const allUsers = await prisma.user.findMany({
        where: {
          role: { notIn: ['ADMIN'] }, // Exclude other admins
        },
        select: { id: true },
      });
      teamMemberIds = allUsers.map((user) => user.id);
    } else if (sessionUserRole === 'SALES_LEAD' || sessionUserRole === 'SERVICE_LEAD') {
      // SALES_LEAD and SERVICE_LEAD see only their direct reports + themselves
      const teamMembers = await prisma.user.findMany({
        where: {
          OR: [
            { id: parseInt(sessionUserId) }, // Include self (the lead)
            { managerId: parseInt(sessionUserId) }, // Include only direct reports
          ],
        },
        select: { id: true },
      });
      teamMemberIds = teamMembers.map((user) => user.id);
    } else {
      // Fallback for other roles - just show their own data
      teamMemberIds = [managerIdInt];
    }
  } else {
    // Individual users only see themselves
    teamMemberIds = [managerIdInt];
  }

  const teamMembers = await prisma.user.findMany({
    where: { id: { in: teamMemberIds } },
    select: { id: true, name: true, username: true, role: true },
  });

  const agentPerformances: AgentPerformance[] = [];
  const teamTotals: WeeklyMetrics = {
    peopleContacted: 0,
    lifeSalesConversations: 0,
    sales: 0,
    referralRequests: 0,
    rawNew: 0,
    multiLine: 0,
  };

  for (const member of teamMembers) {
    const forecastData = await prisma.weeklyForecast.findFirst({
      where: { userId: member.id, weekStartDate: weekStartUTC },
    });
    const forecast: WeeklyMetrics = (forecastData?.forecast as WeeklyMetrics) || {
      peopleContacted: 0,
      lifeSalesConversations: 0,
      sales: 0,
      referralRequests: 0,
    };

    const weeklyActivities = await prisma.weeklyActivity.findMany({
      where: { userId: member.id, weekStartDate: weekStartUTC },
      orderBy: { date: 'asc' },
    });

    const aggregatedWeeklyData: WeeklyActivityData = {
      monday: {
        closed: { auto: 0, lifeHealth: 0, fire: 0 },
        quotes: 0,
        dials: 0,
        referrals: { ask: 0, received: 0 },
        rawNew: 0,
        multiLine: 0,
      },
      tuesday: {
        closed: { auto: 0, lifeHealth: 0, fire: 0 },
        quotes: 0,
        dials: 0,
        referrals: { ask: 0, received: 0 },
        rawNew: 0,
        multiLine: 0,
      },
      wednesday: {
        closed: { auto: 0, lifeHealth: 0, fire: 0 },
        quotes: 0,
        dials: 0,
        referrals: { ask: 0, received: 0 },
        rawNew: 0,
        multiLine: 0,
      },
      thursday: {
        closed: { auto: 0, lifeHealth: 0, fire: 0 },
        quotes: 0,
        dials: 0,
        referrals: { ask: 0, received: 0 },
        rawNew: 0,
        multiLine: 0,
      },
      friday: {
        closed: { auto: 0, lifeHealth: 0, fire: 0 },
        quotes: 0,
        dials: 0,
        referrals: { ask: 0, received: 0 },
        rawNew: 0,
        multiLine: 0,
      },
    };
    for (const activity of weeklyActivities) {
      const activityData = activity.data as WeeklyActivityData;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      for (const day of days) {
        if (activityData[day]) {
          const dayData = activityData[day];
          aggregatedWeeklyData[day].closed.auto += dayData.closed?.auto || 0;
          aggregatedWeeklyData[day].closed.lifeHealth += dayData.closed?.lifeHealth || 0;
          aggregatedWeeklyData[day].closed.fire += dayData.closed?.fire || 0;
          aggregatedWeeklyData[day].quotes += dayData.quotes || 0;
          aggregatedWeeklyData[day].dials += dayData.dials || 0;
          aggregatedWeeklyData[day].referrals.ask += dayData.referrals?.ask || 0;
          aggregatedWeeklyData[day].referrals.received += dayData.referrals?.received || 0;
          aggregatedWeeklyData[day].rawNew += dayData.rawNew || 0;
          aggregatedWeeklyData[day].multiLine += dayData.multiLine || 0;
        }
      }
    }

    const actual = calculateWeeklyActuals(aggregatedWeeklyData);

    const performanceMetrics = calculatePerformanceMetrics(actual, forecast);
    agentPerformances.push({
      userId: member.id.toString(),
      userName: member.name || member.username,
      userRole: member.role,
      forecast,
      actual,
      performanceMetrics,
    });
    teamTotals.peopleContacted += actual.peopleContacted;
    teamTotals.lifeSalesConversations += actual.lifeSalesConversations;
    teamTotals.sales += actual.sales;
    teamTotals.referralRequests += actual.referralRequests;
    if (teamTotals.rawNew !== undefined) {
      teamTotals.rawNew += actual.rawNew || 0;
    }
    if (teamTotals.multiLine !== undefined) {
      teamTotals.multiLine += actual.multiLine || 0;
    }
  }

  const response: TeamPerformance = {
    teamSummary: { ...teamTotals, totalAgents: teamMembers.length },
    agents: agentPerformances,
  };
  return NextResponse.json(response);
}
