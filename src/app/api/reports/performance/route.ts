import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  eachWeekOfInterval,
  format,
} from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    // Fetch WeeklyActivity and WeeklyForecast data
    const [weeklyActivities, weeklyForecasts] = await Promise.all([
      prisma.weeklyActivity.findMany({
        where: {
          weekStartDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          User: true,
        },
      }),
      prisma.weeklyForecast.findMany({
        where: {
          weekStartDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          User: true,
        },
      }),
    ]);

    // Process performance data
    const timeSeriesData: any[] = [];
    let totalAchieved = 0;
    let totalBelowTarget = 0;
    let totalAboveTarget = 0;
    let totalRawNew = 0; // Total Raw New indicators
    let totalMultiLine = 0; // Total Multi-line indicators

    // Group activities and forecasts by week
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

    weeks.forEach((weekStart) => {
      const weekActivities = weeklyActivities.filter((activity) => {
        const activityWeek = new Date(activity.weekStartDate);
        return activityWeek.getTime() === weekStart.getTime();
      });

      const weekForecasts = weeklyForecasts.filter((forecast) => {
        const forecastWeek = new Date(forecast.weekStartDate);
        return forecastWeek.getTime() === weekStart.getTime();
      });

      // Calculate actual performance for the week
      let weekActual = 0;
      let weekTarget = 0;
      let weekRawNew = 0;
      let weekMultiLine = 0;

      weekActivities.forEach((activity) => {
        const data = activity.data as any;
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
          if (data[day]) {
            // Calculate performance metric (people contacted + life conversations + sales)
            weekActual += data[day].dials || 0;
            weekActual += data[day].quotes || 0;
            const closed = data[day].closed || {};
            weekActual += (closed.auto || 0) + (closed.lifeHealth || 0) + (closed.fire || 0);

            // Count RN/ML indicators
            weekRawNew +=
              (closed.autoRawNew || 0) + (closed.lifeHealthRawNew || 0) + (closed.fireRawNew || 0);
            weekMultiLine +=
              (closed.autoMultiLine || 0) +
              (closed.lifeHealthMultiLine || 0) +
              (closed.fireMultiLine || 0);
            weekRawNew += data[day].quotesRawNew || 0;
            weekMultiLine += data[day].quotesMultiLine || 0;
          }
        });
      });

      totalRawNew += weekRawNew;
      totalMultiLine += weekMultiLine;

      // Calculate target from forecasts
      weekForecasts.forEach((forecast) => {
        const forecastData = forecast.forecast as any;
        weekTarget += forecastData.peopleContacted || 0;
        weekTarget += forecastData.lifeSalesConversations || 0;
        weekTarget += forecastData.sales || 0;
      });

      // If no forecast, use a default target based on role
      if (weekTarget === 0) {
        weekTarget = weekActivities.length * 50; // Default 50 per user
      }

      // Calculate performance status
      const performanceRatio = weekTarget > 0 ? weekActual / weekTarget : 0;
      if (performanceRatio >= 0.95) {
        totalAchieved++;
      } else if (performanceRatio >= 1.1) {
        totalAboveTarget++;
      } else {
        totalBelowTarget++;
      }

      timeSeriesData.push({
        label: format(weekStart, 'MMM d'),
        actual: weekActual,
        target: weekTarget,
        performanceRatio: Math.round(performanceRatio * 100),
      });
    });

    // Calculate team averages
    const uniqueUserIds = new Set([
      ...weeklyActivities.map((a) => a.userId),
      ...weeklyForecasts.map((f) => f.userId),
    ]);

    const teamSize = uniqueUserIds.size || 1;
    const avgPerformance =
      timeSeriesData.reduce((sum, d) => sum + d.performanceRatio, 0) / timeSeriesData.length || 0;

    // Get top performers
    const userPerformance: Record<
      number,
      {
        user: any;
        actual: number;
        target: number;
        ratio: number;
        rawNew: number;
        multiLine: number;
      }
    > = {};

    weeklyActivities.forEach((activity) => {
      const userId = activity.userId;
      if (!userPerformance[userId]) {
        userPerformance[userId] = {
          user: activity.User,
          actual: 0,
          target: 0,
          ratio: 0,
          rawNew: 0,
          multiLine: 0,
        };
      }

      const data = activity.data as any;
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
        if (data[day]) {
          userPerformance[userId].actual += data[day].dials || 0;
          userPerformance[userId].actual += data[day].quotes || 0;
          const closed = data[day].closed || {};
          userPerformance[userId].actual +=
            (closed.auto || 0) + (closed.lifeHealth || 0) + (closed.fire || 0);

          // Count RN/ML indicators per user
          userPerformance[userId].rawNew +=
            (closed.autoRawNew || 0) + (closed.lifeHealthRawNew || 0) + (closed.fireRawNew || 0);
          userPerformance[userId].multiLine +=
            (closed.autoMultiLine || 0) +
            (closed.lifeHealthMultiLine || 0) +
            (closed.fireMultiLine || 0);
          userPerformance[userId].rawNew += data[day].quotesRawNew || 0;
          userPerformance[userId].multiLine += data[day].quotesMultiLine || 0;
        }
      });
    });

    weeklyForecasts.forEach((forecast) => {
      const userId = forecast.userId;
      if (userPerformance[userId]) {
        const forecastData = forecast.forecast as any;
        userPerformance[userId].target += forecastData.peopleContacted || 0;
        userPerformance[userId].target += forecastData.lifeSalesConversations || 0;
        userPerformance[userId].target += forecastData.sales || 0;
      }
    });

    // Calculate ratios and sort
    Object.values(userPerformance).forEach((perf) => {
      perf.ratio = perf.target > 0 ? perf.actual / perf.target : 0;
    });

    const topPerformers = Object.values(userPerformance)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5)
      .map((perf) => ({
        User: {
          id: perf.user.id,
          name: perf.user.name,
          role: perf.user.role,
        },
        actual: perf.actual,
        target: perf.target,
        performanceRatio: Math.round(perf.ratio * 100),
        rawNew: perf.rawNew,
        multiLine: perf.multiLine,
      }));

    return NextResponse.json({
      timeSeriesData,
      summary: {
        avgPerformance: Math.round(avgPerformance),
        teamSize,
        performanceMetrics: {
          achieved: totalAchieved,
          belowTarget: totalBelowTarget,
          aboveTarget: totalAboveTarget,
        },
        indicators: {
          totalRawNew,
          totalMultiLine,
          avgRawNewPerUser: teamSize > 0 ? Math.round(totalRawNew / teamSize) : 0,
          avgMultiLinePerUser: teamSize > 0 ? Math.round(totalMultiLine / teamSize) : 0,
        },
        topPerformers,
      },
    });
  } catch (error) {
    console.error('Error in performance report:', error);
    return NextResponse.json({ error: 'Failed to generate performance report' }, { status: 500 });
  }
}
