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
  eachDayOfInterval,
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

    // Fetch WeeklyActivity data for sales metrics
    const weeklyActivities = await prisma.weeklyActivity.findMany({
      where: {
        weekStartDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        User: true,
      },
    });

    // Process sales data
    const timeSeriesData: any[] = [];
    const salesByProduct: Record<string, number> = {
      'Auto Insurance': 0,
      'Life & Health Insurance': 0,
      'Property & Fire Insurance': 0,
    };

    let totalSales = 0;
    let totalRevenue = 0;
    let totalRawNew = 0; // Track Raw New indicators
    let totalMultiLine = 0; // Track Multi-line indicators

    // Generate time series based on range
    if (range === 'week') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      days.forEach((day) => {
        const dayName = format(day, 'EEE').toLowerCase();
        let daySales = 0;
        let dayRevenue = 0;

        weeklyActivities.forEach((activity) => {
          const data = activity.data as any;
          if (data[dayName]) {
            const closed = data[dayName].closed || {};
            const auto = closed.auto || 0;
            const lifeHealth = closed.lifeHealth || 0;
            const fire = closed.fire || 0;

            // Count indicators
            const autoRN = closed.autoRawNew || 0;
            const autoML = closed.autoMultiLine || 0;
            const lifeRN = closed.lifeHealthRawNew || 0;
            const lifeML = closed.lifeHealthMultiLine || 0;
            const fireRN = closed.fireRawNew || 0;
            const fireML = closed.fireMultiLine || 0;

            daySales += auto + lifeHealth + fire;
            salesByProduct['Auto Insurance'] += auto;
            salesByProduct['Life & Health Insurance'] += lifeHealth;
            salesByProduct['Property & Fire Insurance'] += fire;

            // Total indicators
            totalRawNew += autoRN + lifeRN + fireRN;
            totalMultiLine += autoML + lifeML + fireML;

            // Estimate revenue (auto: $1200, life: $2000, fire: $1500 average)
            dayRevenue += auto * 1200 + lifeHealth * 2000 + fire * 1500;
          }
        });

        totalSales += daySales;
        totalRevenue += dayRevenue;

        timeSeriesData.push({
          label: format(day, 'MMM d'),
          sales: daySales,
          revenue: dayRevenue,
        });
      });
    } else {
      // For month/quarter/year, aggregate by week
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

      weeks.forEach((weekStart) => {
        let weekSales = 0;
        let weekRevenue = 0;

        weeklyActivities
          .filter((activity) => {
            const activityWeek = new Date(activity.weekStartDate);
            return (
              activityWeek >= weekStart &&
              activityWeek < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            );
          })
          .forEach((activity) => {
            const data = activity.data as any;
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
              if (data[day]) {
                const closed = data[day].closed || {};
                const auto = closed.auto || 0;
                const lifeHealth = closed.lifeHealth || 0;
                const fire = closed.fire || 0;

                // Count indicators
                const autoRN = closed.autoRawNew || 0;
                const autoML = closed.autoMultiLine || 0;
                const lifeRN = closed.lifeHealthRawNew || 0;
                const lifeML = closed.lifeHealthMultiLine || 0;
                const fireRN = closed.fireRawNew || 0;
                const fireML = closed.fireMultiLine || 0;

                weekSales += auto + lifeHealth + fire;
                salesByProduct['Auto Insurance'] += auto;
                salesByProduct['Life & Health Insurance'] += lifeHealth;
                salesByProduct['Property & Fire Insurance'] += fire;

                // Total indicators
                totalRawNew += autoRN + lifeRN + fireRN;
                totalMultiLine += autoML + lifeML + fireML;

                weekRevenue += auto * 1200 + lifeHealth * 2000 + fire * 1500;
              }
            });
          });

        totalSales += weekSales;
        totalRevenue += weekRevenue;

        timeSeriesData.push({
          label: format(weekStart, 'MMM d'),
          sales: weekSales,
          revenue: weekRevenue,
        });
      });
    }

    // Calculate average sales per user
    const uniqueUserIds = new Set(weeklyActivities.map((a) => a.userId));
    const avgSalesPerUser = uniqueUserIds.size > 0 ? totalSales / uniqueUserIds.size : 0;

    // Get previous period for comparison
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (range) {
      case 'week':
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - 6);
        break;
      case 'month':
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        break;
      case 'quarter':
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 3);
        break;
      case 'year':
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
        break;
      default:
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate);
    }

    const prevWeeklyActivities = await prisma.weeklyActivity.findMany({
      where: {
        weekStartDate: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
    });

    let prevTotalSales = 0;
    prevWeeklyActivities.forEach((activity) => {
      const data = activity.data as any;
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
        if (data[day]) {
          const closed = data[day].closed || {};
          prevTotalSales += (closed.auto || 0) + (closed.lifeHealth || 0) + (closed.fire || 0);
        }
      });
    });

    const percentageChange =
      prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

    return NextResponse.json({
      timeSeriesData,
      summary: {
        totalSales,
        totalRevenue,
        avgSalesPerUser: Math.round(avgSalesPerUser * 10) / 10,
        percentageChange: Math.round(percentageChange * 10) / 10,
        salesByProduct,
        indicators: {
          rawNew: totalRawNew,
          multiLine: totalMultiLine,
          rawNewPercentage: totalSales > 0 ? Math.round((totalRawNew / totalSales) * 1000) / 10 : 0,
          multiLinePercentage:
            totalSales > 0 ? Math.round((totalMultiLine / totalSales) * 1000) / 10 : 0,
        },
        topProducts: Object.entries(salesByProduct)
          .sort((a, b) => b[1] - a[1])
          .map(([product, count]) => ({ product, count })),
      },
    });
  } catch (error) {
    console.error('Error in sales report:', error);
    return NextResponse.json({ error: 'Failed to generate sales report' }, { status: 500 });
  }
}
