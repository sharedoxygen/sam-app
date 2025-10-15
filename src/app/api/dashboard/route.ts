import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { parseISO, isValid, differenceInDays, format } from 'date-fns';
import { ChartData } from 'chart.js';

// Force dynamic rendering to prevent static generation errors with headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper functions for date handling
function getWeekStartUTC(date: Date = new Date()): Date {
  const weekStart = new Date(date);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1); // Monday
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

function getWeekEndUTC(date: Date = new Date()): Date {
  const weekEnd = new Date(date);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - weekEnd.getUTCDay() + 7); // Sunday
  weekEnd.setUTCHours(23, 59, 59, 999);
  return weekEnd;
}

// GET /api/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id as string, 10);
    const userRole = session.user.role as Role;

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // New filter parameters
    const viewBy = searchParams.get('viewBy') || 'week';
    const agentIdsParam = searchParams.get('agentIds');
    const department = searchParams.get('department') || 'all';

    let queryStartDate: Date;
    let queryEndDate: Date;

    if (startDateParam && isValid(parseISO(startDateParam))) {
      const parsedStartDate = parseISO(startDateParam);
      queryStartDate = new Date(
        parsedStartDate.getFullYear(),
        parsedStartDate.getMonth(),
        parsedStartDate.getDate(),
        0,
        0,
        0,
        0
      );
    } else {
      // Use local time instead of UTC for consistency with database dates
      const now = new Date();
      queryStartDate = new Date(now);
      queryStartDate.setDate(queryStartDate.getDate() - queryStartDate.getDay() + 1); // Monday
      queryStartDate.setHours(0, 0, 0, 0);
    }

    if (endDateParam && isValid(parseISO(endDateParam))) {
      const parsedEndDate = parseISO(endDateParam);
      queryEndDate = new Date(
        parsedEndDate.getFullYear(),
        parsedEndDate.getMonth(),
        parsedEndDate.getDate(),
        23,
        59,
        59,
        999
      );
    } else {
      // Use local time instead of UTC for consistency with database dates
      const baseDate = startDateParam && isValid(parseISO(startDateParam)) ? parseISO(startDateParam) : new Date();
      queryEndDate = new Date(baseDate);
      queryEndDate.setDate(queryEndDate.getDate() - queryEndDate.getDay() + 7); // Sunday
      queryEndDate.setHours(23, 59, 59, 999);
    }

    // Parse query parameters and set date ranges

    // Logic for different roles and filters
    let userIdsForQuery: number[];

    // Parse agent IDs if provided
    const specificAgentIds = agentIdsParam
      ? agentIdsParam
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
      : [];

    if (specificAgentIds.length > 0) {
      userIdsForQuery = specificAgentIds;
    } else {
      if (userRole === Role.ADMIN || userRole === Role.OFFICE_MANAGER) {
        const allUsers = await prisma.user.findMany({
          where:
            department !== 'all'
              ? {
                role: department === 'sales' ? Role.SALES : Role.SERVICE,
              }
              : undefined,
          select: { id: true },
        });
        userIdsForQuery = allUsers.map((u: any) => u.id);
      } else if (userRole === Role.SALES_LEAD || userRole === Role.SERVICE_LEAD) {
        const currentUserWithReports = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            other_User: {
              select: { id: true, role: true },
              where:
                department !== 'all'
                  ? {
                    role: department === 'sales' ? Role.SALES : Role.SERVICE,
                  }
                  : undefined,
            },
          },
        });
        if (!currentUserWithReports)
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        userIdsForQuery = [
          userId,
          ...currentUserWithReports.other_User.map((report: any) => report.id),
        ];
      } else {
        userIdsForQuery = [userId];
      }
    }

    // Fetch performance targets for the same date range and users
    const performanceTargets = await prisma.performanceTarget.findMany({
      where: {
        userId: { in: userIdsForQuery },
        weekStartDate: {
          gte: new Date(queryStartDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: queryEndDate,
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    });

    // Calculate aggregated targets
    const aggregatedTargets = {
      peopleContacted: 0,
      lifeSalesConversations: 0,
      sales: 0,
      referralRequests: 0,
      premiumAmount: 0,
    };

    performanceTargets.forEach(target => {
      aggregatedTargets.peopleContacted += target.peopleContacted;
      aggregatedTargets.lifeSalesConversations += target.lifeSalesConversations;
      aggregatedTargets.sales += target.sales;
      aggregatedTargets.referralRequests += target.referralRequests;
      aggregatedTargets.premiumAmount += Number(target.premiumAmount);
    });

    // Initialize response structure
    const response: {
      weeklyMetrics: any;
      targets: any;
      ratios: any;
      timeSeries: ChartData<'line', number[], string>;
      queryDates: { start: string; end: string };
      filters: any;
      debug?: any;
    } = {
      weeklyMetrics: {
        sales: 0,
        dials: 0,
        quotes: 0,
        referrals: 0,
        referralsReceived: 0,
        rawNew: 0,
        multiLine: 0,
        rawNewQuotes: 0,
        multiLineQuotes: 0,
        totalPremiumAmount: 0,
        peopleContacted: 0,
        lifeSalesConversations: 0,
      },
      targets: aggregatedTargets,
      ratios: {
        dialToQuote: 0,
        quoteToSale: 0,
        dialToSale: 0,
        rawNewPercentage: 0,
        multiLinePercentage: 0,
        averagePremiumAmount: 0,
      },
      timeSeries: {
        labels: [] as string[],
        datasets: [] as any[],
      },
      queryDates: { start: queryStartDate.toISOString(), end: queryEndDate.toISOString() },
      filters: { viewBy, department, agentIds: agentIdsParam },
      debug: {
        userIdsQueried: [],
        weeklyActivitiesFound: 0,
        performanceTargetsFound: performanceTargets.length,
        dateRangeUsed: {
          start: queryStartDate.toISOString(),
          end: queryEndDate.toISOString(),
        },
      },
    };

    // Update the targets in the response
    response.targets = aggregatedTargets;

    // Enhanced WeeklyActivity query with proper date range logic
    const weeklyActivities = await prisma.weeklyActivity.findMany({
      where: {
        userId: { in: userIdsForQuery },
        weekStartDate: {
          // Use broader date range to capture all relevant weeks
          gte: new Date(queryStartDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: queryEndDate,
        },
      },
      include: {
        User: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });

    // Validation and processing logic

    // Update debug info
    response.debug.userIdsQueried = userIdsForQuery;
    response.debug.weeklyActivitiesFound = weeklyActivities.length;
    response.debug.performanceTargetsFound = performanceTargets.length;
    response.debug.queryStartDate = queryStartDate.toISOString();
    response.debug.queryEndDate = queryEndDate.toISOString();

    // Calculate the number of days in the date range
    const daysDifference = differenceInDays(queryEndDate, queryStartDate) + 1;

    // Determine chart granularity based on viewBy parameter
    let chartGranularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
    switch (viewBy) {
      case 'day':
        chartGranularity = 'daily';
        break;
      case 'week':
        chartGranularity = 'weekly';
        break;
      case 'month':
        chartGranularity = 'monthly';
        break;
      case 'year':
        chartGranularity = 'yearly';
        break;
      default:
        chartGranularity =
          daysDifference <= 7
            ? 'daily'
            : daysDifference <= 90
              ? 'weekly'
              : daysDifference <= 365
                ? 'monthly'
                : 'yearly';
    }

    // Process weekly activities to calculate metrics
    const timeSeriesData: Record<string, { dials: number; quotes: number; sales: number }> = {};

    if (weeklyActivities.length > 0) {
      for (const activity of weeklyActivities) {
        const data = activity.data as any;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

        // Process days for weeks that overlap with our query range
        for (const day of days) {
          if (data[day]) {
            // Calculate the actual date for this day
            const weekStart = new Date(activity.weekStartDate);
            const dayIndex = days.indexOf(day);
            const actualDate = new Date(weekStart);
            actualDate.setDate(actualDate.getDate() + dayIndex);

            // Include data if the actual date falls within query range OR if we're looking at the current week
            const isCurrentWeek = weekStart >= queryStartDate && weekStart <= queryEndDate;
            const isDateInRange = actualDate >= queryStartDate && actualDate <= queryEndDate;

            if (isCurrentWeek || isDateInRange) {
              response.weeklyMetrics.dials += data[day].dials || 0;
              response.weeklyMetrics.quotes += data[day].quotes || 0;

              // Calculate people contacted (estimate from dials and quotes)
              response.weeklyMetrics.peopleContacted += Math.round((data[day].dials || 0) * 0.35 + (data[day].quotes || 0) * 0.8);

              // Calculate life sales conversations (estimate from sales and quotes)
              const dayClosedSales = (data[day].closed?.auto || 0) + (data[day].closed?.fire || 0) + (data[day].closed?.lifeHealth || 0);
              response.weeklyMetrics.lifeSalesConversations += Math.round(dayClosedSales * 2.0 + (data[day].quotes || 0) * 0.5);

              // Count quotes with indicators
              response.weeklyMetrics.rawNewQuotes += data[day].quotesRawNew || 0;
              response.weeklyMetrics.multiLineQuotes += data[day].quotesMultiLine || 0;

              if (data[day].closed) {
                response.weeklyMetrics.sales +=
                  (data[day].closed.auto || 0) +
                  (data[day].closed.fire || 0) +
                  (data[day].closed.lifeHealth || 0);

                // Count sales with indicators
                response.weeklyMetrics.rawNew +=
                  (data[day].closed.autoRawNew || 0) +
                  (data[day].closed.fireRawNew || 0) +
                  (data[day].closed.lifeHealthRawNew || 0);

                response.weeklyMetrics.multiLine +=
                  (data[day].closed.autoMultiLine || 0) +
                  (data[day].closed.fireMultiLine || 0) +
                  (data[day].closed.lifeHealthMultiLine || 0);

                // Calculate premium amounts
                response.weeklyMetrics.totalPremiumAmount +=
                  (data[day].closed.automotivePremium || 0) +
                  (data[day].closed.lifeHealthPremium || 0) +
                  (data[day].closed.propertyFirePremium || 0);
              }

              if (data[day].referrals) {
                response.weeklyMetrics.referrals += data[day].referrals.ask || 0;
                response.weeklyMetrics.referralsReceived += data[day].referrals.received || 0;
              }

              // Build time series data based on granularity
              if (chartGranularity === 'daily') {
                const dateKey = format(actualDate, 'MMM d');
                if (!timeSeriesData[dateKey]) {
                  timeSeriesData[dateKey] = { dials: 0, quotes: 0, sales: 0 };
                }
                timeSeriesData[dateKey].dials += data[day].dials || 0;
                timeSeriesData[dateKey].quotes += data[day].quotes || 0;
                if (data[day].closed) {
                  timeSeriesData[dateKey].sales +=
                    (data[day].closed.auto || 0) +
                    (data[day].closed.fire || 0) +
                    (data[day].closed.lifeHealth || 0);
                }
              } else if (chartGranularity === 'weekly') {
                const weekKey = format(activity.weekStartDate, 'MMM d');
                if (!timeSeriesData[weekKey]) {
                  timeSeriesData[weekKey] = { dials: 0, quotes: 0, sales: 0 };
                }
                timeSeriesData[weekKey].dials += data[day].dials || 0;
                timeSeriesData[weekKey].quotes += data[day].quotes || 0;
                if (data[day].closed) {
                  timeSeriesData[weekKey].sales +=
                    (data[day].closed.auto || 0) +
                    (data[day].closed.fire || 0) +
                    (data[day].closed.lifeHealth || 0);
                }
              }
            }
          }
        }

        // For monthly and yearly granularity
        if (chartGranularity === 'monthly') {
          const monthKey = format(activity.weekStartDate, 'MMM yyyy');
          if (!timeSeriesData[monthKey]) {
            timeSeriesData[monthKey] = { dials: 0, quotes: 0, sales: 0 };
          }
          for (const day of days) {
            if (data[day]) {
              timeSeriesData[monthKey].dials += data[day].dials || 0;
              timeSeriesData[monthKey].quotes += data[day].quotes || 0;
              if (data[day].closed) {
                timeSeriesData[monthKey].sales +=
                  (data[day].closed.auto || 0) +
                  (data[day].closed.fire || 0) +
                  (data[day].closed.lifeHealth || 0);
              }
            }
          }
        }

        if (chartGranularity === 'yearly') {
          const yearKey = format(activity.weekStartDate, 'yyyy');
          if (!timeSeriesData[yearKey]) {
            timeSeriesData[yearKey] = { dials: 0, quotes: 0, sales: 0 };
          }
          for (const day of days) {
            if (data[day]) {
              timeSeriesData[yearKey].dials += data[day].dials || 0;
              timeSeriesData[yearKey].quotes += data[day].quotes || 0;
              if (data[day].closed) {
                timeSeriesData[yearKey].sales +=
                  (data[day].closed.auto || 0) +
                  (data[day].closed.fire || 0) +
                  (data[day].closed.lifeHealth || 0);
              }
            }
          }
        }
      }

      // Calculate ratios for weeklyMetrics
      if (response.weeklyMetrics.dials > 0) {
        response.ratios.dialToQuote = Math.round(
          (response.weeklyMetrics.quotes / response.weeklyMetrics.dials) * 100
        );
        response.ratios.dialToSale = Math.round(
          (response.weeklyMetrics.sales / response.weeklyMetrics.dials) * 100
        );
      }

      if (response.weeklyMetrics.quotes > 0) {
        response.ratios.quoteToSale = Math.round(
          (response.weeklyMetrics.sales / response.weeklyMetrics.quotes) * 100
        );
      }

      // Calculate indicator percentages
      if (response.weeklyMetrics.sales > 0) {
        response.ratios.rawNewPercentage = Math.round(
          (response.weeklyMetrics.rawNew / response.weeklyMetrics.sales) * 100
        );
        response.ratios.multiLinePercentage = Math.round(
          (response.weeklyMetrics.multiLine / response.weeklyMetrics.sales) * 100
        );
        response.ratios.averagePremiumAmount = Math.round(
          response.weeklyMetrics.totalPremiumAmount / response.weeklyMetrics.sales
        );
      }
    }

    // Create labels and sort time series data
    const sortedLabels = Object.keys(timeSeriesData).sort((a, b) => {
      if (chartGranularity === 'yearly') {
        return parseInt(a) - parseInt(b);
      }
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Limit the number of data points for readability
    const maxDataPoints =
      chartGranularity === 'daily'
        ? 30
        : chartGranularity === 'weekly'
          ? 12
          : chartGranularity === 'monthly'
            ? 12
            : 5;
    const labels = sortedLabels.slice(-maxDataPoints);

    response.timeSeries = {
      labels,
      datasets: [
        {
          label: 'Dials',
          data: labels.map((l) => timeSeriesData[l]?.dials || 0),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Quotes',
          data: labels.map((l) => timeSeriesData[l]?.quotes || 0),
          borderColor: '#fd7e14',
          backgroundColor: 'rgba(253, 126, 20, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Sales',
          data: labels.map((l) => timeSeriesData[l]?.sales || 0),
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          tension: 0.4,
        },
      ],
    };

    // Return the response

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
