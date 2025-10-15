import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

// Force dynamic rendering to prevent static generation errors with headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'premium-trends';
    const dateRange = searchParams.get('range') || 'month';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Check user role for department filtering
    const userRole = session.user.role;
    const userId = parseInt(session.user.id as string, 10);
    const isLead = userRole === Role.SALES_LEAD || userRole === Role.SERVICE_LEAD;
    const isAdmin = userRole === Role.ADMIN;

    let response: any = {};

    switch (reportType) {
      case 'premium-trends':
        response = await getPremiumTrends(startDate, endDate, userRole, userId);
        break;
      case 'agent-performance':
        response = await getAgentPerformance(startDate, endDate, userRole, userId);
        break;
      case 'activity-completion':
        response = await getActivityCompletion(startDate, endDate, userRole, userId);
        break;
      case 'department-comparison':
        if (isAdmin || isLead) {
          response = await getDepartmentComparison(startDate, endDate, userRole, userId);
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getPremiumTrends(startDate: Date, endDate: Date, userRole: string, userId: number) {
  // Get agents based on role
  const agents = await getAgentsForRole(userRole, userId);
  const agentIds = agents.map((a) => a.id);

  // Get weekly activities for the date range
  const activities = await prisma.weeklyActivity.findMany({
    where: {
      userId: { in: agentIds },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      User: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Process data by time periods
  const periodData = new Map<string, { total: number; sales: number; service: number }>();

  activities.forEach((activity) => {
    const weekKey = getWeekKey(activity.date);
    const data = activity.data as any;

    if (!periodData.has(weekKey)) {
      periodData.set(weekKey, { total: 0, sales: 0, service: 0 });
    }

    const period = periodData.get(weekKey)!;

    // Sum premium amounts for the week
    Object.values(data || {}).forEach((dayData: any) => {
      if (dayData?.closed) {
        const dayPremium =
          (dayData.closed.automotivePremium || 0) +
          (dayData.closed.lifeHealthPremium || 0) +
          (dayData.closed.propertyFirePremium || 0);

        period.total += dayPremium;

        if (activity.User.role === Role.SALES) {
          period.sales += dayPremium;
        } else if (activity.User.role === Role.SERVICE) {
          period.service += dayPremium;
        }
      }
    });
  });

  // Convert to arrays for chart
  const sortedPeriods = Array.from(periodData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const labels = sortedPeriods.map(([key]) => formatDateLabel(key));
  const totalPremium = sortedPeriods.map(([_, data]) => data.total);
  const salesPremium = sortedPeriods.map(([_, data]) => data.sales);
  const servicePremium = sortedPeriods.map(([_, data]) => data.service);

  // Calculate summary
  const totalSum = totalPremium.reduce((a, b) => a + b, 0);
  const previousPeriodTotal = totalPremium
    .slice(0, Math.floor(totalPremium.length / 2))
    .reduce((a, b) => a + b, 0);
  const currentPeriodTotal = totalPremium
    .slice(Math.floor(totalPremium.length / 2))
    .reduce((a, b) => a + b, 0);
  const growthRate =
    previousPeriodTotal > 0
      ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100)
      : 0;

  return {
    labels,
    totalPremium,
    salesPremium,
    servicePremium,
    summary: {
      totalPremium: totalSum,
      averagePremium: totalPremium.length > 0 ? Math.round(totalSum / totalPremium.length) : 0,
      growthRate,
      totalSales: activities.length,
    },
  };
}

async function getAgentPerformance(
  startDate: Date,
  endDate: Date,
  userRole: string,
  userId: number
) {
  const agents = await getAgentsForRole(userRole, userId);

  const agentPerformance = await Promise.all(
    agents.map(async (agent) => {
      const activities = await prisma.weeklyActivity.findMany({
        where: {
          userId: agent.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      let totalPremium = 0;
      let salesCount = 0;
      let totalActivities = 0;
      let completedActivities = 0;

      activities.forEach((activity) => {
        const data = activity.data as any;

        Object.values(data || {}).forEach((dayData: any) => {
          if (dayData?.closed) {
            totalPremium +=
              (dayData.closed.automotivePremium || 0) +
              (dayData.closed.lifeHealthPremium || 0) +
              (dayData.closed.propertyFirePremium || 0);

            salesCount +=
              (dayData.closed.auto || 0) +
              (dayData.closed.lifeHealth || 0) +
              (dayData.closed.fire || 0);
          }

          // Count activities
          if (dayData?.quotes > 0 || dayData?.dials > 0) {
            totalActivities++;
            if (dayData?.closed && Object.values(dayData.closed).some((v: any) => v > 0)) {
              completedActivities++;
            }
          }
        });
      });

      const conversionRate =
        totalActivities > 0 ? Math.round((salesCount / totalActivities) * 100) : 0;
      const activityCompletionRate =
        totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

      return {
        agentName: agent.name,
        department: agent.role === Role.SALES ? 'Sales' : 'Service',
        totalPremium,
        salesCount,
        conversionRate,
        activityCompletionRate,
      };
    })
  );

  // Sort by total premium descending
  agentPerformance.sort((a, b) => b.totalPremium - a.totalPremium);

  return {
    agents: agentPerformance,
    summary: {
      totalAgents: agentPerformance.length,
      topPerformer: agentPerformance[0]?.agentName || 'N/A',
      averagePremium:
        agentPerformance.length > 0
          ? Math.round(
              agentPerformance.reduce((sum, a) => sum + a.totalPremium, 0) / agentPerformance.length
            )
          : 0,
    },
  };
}

async function getActivityCompletion(
  startDate: Date,
  endDate: Date,
  userRole: string,
  userId: number
) {
  const agents = await getAgentsForRole(userRole, userId);
  const agentIds = agents.map((a) => a.id);

  const activities = await prisma.weeklyActivity.findMany({
    where: {
      userId: { in: agentIds },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  let totalActivities = 0;

  const weeklyStats = {
    calls: 0,
    meetings: 0,
    quotes: 0,
    sales: 0,
  };

  activities.forEach((activity) => {
    const data = activity.data as any;

    Object.values(data || {}).forEach((dayData: any) => {
      if (!dayData) {
        notStarted++;
      } else if (dayData.closed && Object.values(dayData.closed).some((v: any) => v > 0)) {
        completed++;
        // Update weekly stats
        weeklyStats.calls += dayData.dials || 0;
        weeklyStats.quotes += dayData.quotes || 0;
        weeklyStats.sales +=
          (dayData.closed.auto || 0) +
          (dayData.closed.lifeHealth || 0) +
          (dayData.closed.fire || 0);
      } else if (dayData.dials > 0 || dayData.quotes > 0) {
        inProgress++;
        weeklyStats.calls += dayData.dials || 0;
        weeklyStats.quotes += dayData.quotes || 0;
      } else {
        notStarted++;
      }
      totalActivities++;
    });
  });

  const completionRate = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;

  return {
    completion: {
      completed,
      inProgress,
      notStarted,
    },
    summary: {
      completionRate,
      totalActivities,
      averagePerAgent: agents.length > 0 ? Math.round(totalActivities / agents.length) : 0,
      activeAgents: agents.length,
      weeklyStats,
    },
  };
}

async function getDepartmentComparison(
  startDate: Date,
  endDate: Date,
  userRole: string,
  userId: number
) {
  const salesAgents = await prisma.user.findMany({
    where: {
      role: Role.SALES,
      ...(userRole === Role.SALES_LEAD ? { managerId: userId } : {}),
    },
  });

  const serviceAgents = await prisma.user.findMany({
    where: {
      role: Role.SERVICE,
      ...(userRole === Role.SERVICE_LEAD ? { managerId: userId } : {}),
    },
  });

  const calculateDepartmentStats = async (agents: any[]) => {
    const agentIds = agents.map((a) => a.id);

    const activities = await prisma.weeklyActivity.findMany({
      where: {
        userId: { in: agentIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalPremium = 0;
    let totalActivities = 0;
    let totalSales = 0;

    activities.forEach((activity) => {
      const data = activity.data as any;

      Object.values(data || {}).forEach((dayData: any) => {
        if (dayData) {
          totalActivities++;

          if (dayData.closed) {
            totalPremium +=
              (dayData.closed.automotivePremium || 0) +
              (dayData.closed.lifeHealthPremium || 0) +
              (dayData.closed.propertyFirePremium || 0);

            totalSales +=
              (dayData.closed.auto || 0) +
              (dayData.closed.lifeHealth || 0) +
              (dayData.closed.fire || 0);
          }
        }
      });
    });

    const conversionRate =
      totalActivities > 0 ? Math.round((totalSales / totalActivities) * 100) : 0;

    return {
      totalPremium,
      totalActivities,
      totalSales,
      conversionRate,
      agentCount: agents.length,
    };
  };

  const salesStats = await calculateDepartmentStats(salesAgents);
  const serviceStats = await calculateDepartmentStats(serviceAgents);

  return {
    departments: {
      sales: salesStats,
      service: serviceStats,
    },
    summary: {
      totalPremium: salesStats.totalPremium + serviceStats.totalPremium,
      topDepartment: salesStats.totalPremium > serviceStats.totalPremium ? 'Sales' : 'Service',
      premiumDifference: Math.abs(salesStats.totalPremium - serviceStats.totalPremium),
    },
  };
}

// Helper functions
async function getAgentsForRole(userRole: string, userId: number) {
  let agents: any[] = [];

  switch (userRole) {
    case Role.ADMIN:
    case Role.OFFICE_MANAGER:
      agents = await prisma.user.findMany({
        where: {
          role: { in: [Role.SALES, Role.SERVICE] },
        },
      });
      break;
    case Role.SALES_LEAD:
      agents = await prisma.user.findMany({
        where: {
          role: Role.SALES,
          managerId: userId,
        },
      });
      break;
    case Role.SERVICE_LEAD:
      agents = await prisma.user.findMany({
        where: {
          role: Role.SERVICE,
          managerId: userId,
        },
      });
      break;
    case Role.SALES:
    case Role.SERVICE:
      agents = await prisma.user.findMany({
        where: {
          id: userId,
        },
      });
      break;
  }

  return agents;
}

function getWeekKey(date: Date): string {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
