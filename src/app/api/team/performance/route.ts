import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    const userRole = session.user.role;
    if (
      !userRole ||
      !['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'].includes(userRole)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId') || session.user.id;

    // Get the manager's team members
    let teamUserIds: string[] = [];

    if (userRole === 'ADMIN' || userRole === 'OFFICE_MANAGER') {
      // Admin and Office Manager can see all users
      const allUsers = await prisma.user.findMany({
        where: {
          role: {
            in: [Role.SALES, Role.SERVICE],
          },
        },
        select: { id: true },
      });
      teamUserIds = allUsers.map((u) => u.id.toString());
    } else {
      // For sales/service leads, get their team members
      const roleFilter = userRole === 'SALES_LEAD' ? Role.SALES : Role.SERVICE;
      const teamUsers = await prisma.user.findMany({
        where: {
          role: roleFilter,
        },
        select: { id: true },
      });
      teamUserIds = teamUsers.map((u) => u.id.toString());
    }

    // Get performance data for each team member
    // Use current date or latest data date for analysis
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

    const teamPerformance = await Promise.all(
      teamUserIds.map(async (userId) => {
        const user = await prisma.user.findUnique({
          where: { id: parseInt(userId) },
          select: { id: true, name: true, role: true },
        });

        if (!user) return null;

        // Get today's activities (ONLY actual today's activities - no fallback)
        const todayActivities = await prisma.activity.findMany({
          where: {
            userId: user.id,
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        // Calculate TODAY's actual metrics - no estimation or fallback
        const todayCalls = todayActivities.filter((a) => a.type === 'CALL').length;
        const todayMeetings = todayActivities.filter((a) => a.type === 'MEETING').length;
        const todaySales = todayActivities.filter((a) => a.type === 'SALE').length;

        // Get this week's activities
        const weekActivities = await prisma.activity.findMany({
          where: {
            userId: user.id,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        });

        // Get last week's activities for trend calculation
        const lastWeekActivities = await prisma.activity.findMany({
          where: {
            userId: user.id,
            date: {
              gte: lastWeekStart,
              lte: lastWeekEnd,
            },
          },
        });

        // Get this week's WeeklyActivity data with more flexible date matching
        const weeklyActivity = await prisma.weeklyActivity.findFirst({
          where: {
            userId: user.id,
            weekStartDate: {
              gte: startOfWeek(weekStart, { weekStartsOn: 1 }),
              lte: endOfWeek(weekStart, { weekStartsOn: 1 }),
            },
          },
          orderBy: {
            date: 'desc',
          },
        });

        // Calculate metrics - Use activity types and WeeklyActivity data for sales
        let weekCalls = weekActivities.filter((a) => a.type === 'CALL').length;
        const weekMeetings = weekActivities.filter((a) => a.type === 'MEETING').length;
        const lastWeekMeetings = lastWeekActivities.filter((a) => a.type === 'MEETING').length;

        // Use simple estimates for sales based on meeting activity (will be overridden by WeeklyActivity data)
        let weekSales = Math.round(weekMeetings * 0.3);
        const lastWeekSales = Math.round(lastWeekMeetings * 0.3);

        // Extract data from WeeklyActivity if available for WEEKLY metrics only
        const weeklyMetrics = {
          calls: 0,
          sales: 0,
          quotes: 0,
          referrals: 0,
          rawNew: 0, // Raw New indicator count
          multiLine: 0, // Multi-line indicator count
        };

        if (weeklyActivity) {
          const data = weeklyActivity.data as any;
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
            if (data[day]) {
              weeklyMetrics.calls += data[day].dials || 0;
              weeklyMetrics.quotes += data[day].quotes || 0;
              weeklyMetrics.referrals +=
                (data[day].referrals?.ask || 0) + (data[day].referrals?.received || 0);
              const closed = data[day].closed || {};
              weeklyMetrics.sales +=
                (closed.auto || 0) + (closed.lifeHealth || 0) + (closed.fire || 0);

              // Count RN/ML indicators from closed sales
              weeklyMetrics.rawNew +=
                (closed.autoRawNew || 0) +
                (closed.lifeHealthRawNew || 0) +
                (closed.fireRawNew || 0);
              weeklyMetrics.multiLine +=
                (closed.autoMultiLine || 0) +
                (closed.lifeHealthMultiLine || 0) +
                (closed.fireMultiLine || 0);

              // Also count RN/ML from quotes
              weeklyMetrics.rawNew += data[day].quotesRawNew || 0;
              weeklyMetrics.multiLine += data[day].quotesMultiLine || 0;
            }
          });
        } else {
          // Fallback: Look for any WeeklyActivity data in the current week
          const fallbackActivities = await prisma.weeklyActivity.findMany({
            where: {
              userId: user.id,
              date: {
                gte: weekStart,
                lte: weekEnd,
              },
            },
            orderBy: {
              date: 'desc',
            },
          });

          // Aggregate fallback data
          fallbackActivities.forEach((activity) => {
            const data = activity.data as any;
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
              if (data[day]) {
                weeklyMetrics.calls += data[day].dials || 0;
                weeklyMetrics.quotes += data[day].quotes || 0;
                weeklyMetrics.referrals +=
                  (data[day].referrals?.ask || 0) + (data[day].referrals?.received || 0);
                const closed = data[day].closed || {};
                weeklyMetrics.sales +=
                  (closed.auto || 0) + (closed.lifeHealth || 0) + (closed.fire || 0);

                // Count RN/ML indicators from closed sales
                weeklyMetrics.rawNew +=
                  (closed.autoRawNew || 0) +
                  (closed.lifeHealthRawNew || 0) +
                  (closed.fireRawNew || 0);
                weeklyMetrics.multiLine +=
                  (closed.autoMultiLine || 0) +
                  (closed.lifeHealthMultiLine || 0) +
                  (closed.fireMultiLine || 0);

                // Also count RN/ML from quotes
                weeklyMetrics.rawNew += data[day].quotesRawNew || 0;
                weeklyMetrics.multiLine += data[day].quotesMultiLine || 0;
              }
            });
          });
        }

        // Use WeeklyActivity data for weekly sales if available, otherwise use Activity table estimates
        if (weeklyMetrics.sales > 0) {
          weekSales = weeklyMetrics.sales;
        }
        if (weeklyMetrics.calls > 0) {
          weekCalls = weeklyMetrics.calls;
        }

        // Calculate conversion rate based on weekly data
        const conversionRate = weeklyMetrics.calls > 0
          ? Math.round((weeklyMetrics.sales / weeklyMetrics.calls) * 100 * 10) / 10
          : 0;

        // Calculate trend based on weekly sales vs last week
        const trend = weeklyMetrics.sales > lastWeekSales
          ? 'up'
          : weeklyMetrics.sales < lastWeekSales
            ? 'down'
            : 'stable';
        const trendValue = lastWeekSales > 0
          ? Math.round(((weeklyMetrics.sales - lastWeekSales) / lastWeekSales) * 100)
          : 0;

        return {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          todayMetrics: {
            calls: todayCalls,        // ACTUAL calls made today
            meetings: todayMeetings,  // ACTUAL meetings today  
            sales: todaySales,        // ACTUAL sales today
          },
          weeklyMetrics: {
            calls: weeklyMetrics.calls,
            sales: weeklyMetrics.sales,
            quotes: weeklyMetrics.quotes,
            referrals: weeklyMetrics.referrals,
            rawNew: weeklyMetrics.rawNew,
            multiLine: weeklyMetrics.multiLine,
            rawNewPercentage:
              weeklyMetrics.sales > 0
                ? Math.round((weeklyMetrics.rawNew / weeklyMetrics.sales) * 100)
                : 0,
            multiLinePercentage:
              weeklyMetrics.sales > 0
                ? Math.round((weeklyMetrics.multiLine / weeklyMetrics.sales) * 100)
                : 0,
          },
          performanceMetrics: {
            conversionRate: weeklyMetrics.calls > 0
              ? Math.round((weeklyMetrics.sales / weeklyMetrics.calls) * 100 * 10) / 10
              : 0,
          },
          trend,
          trendValue,
        };
      })
    );

    // Filter out null values
    const validTeamPerformance = teamPerformance.filter((p) => p !== null);

    return NextResponse.json({
      teamMembers: validTeamPerformance,
      summary: {
        totalMembers: validTeamPerformance.length,
        // TODAY'S ACTUAL TOTALS (not estimates)
        totalCallsToday: validTeamPerformance.reduce((sum, m) => sum + m.todayMetrics.calls, 0),
        totalMeetingsToday: validTeamPerformance.reduce((sum, m) => sum + m.todayMetrics.meetings, 0),
        totalSalesToday: validTeamPerformance.reduce((sum, m) => sum + m.todayMetrics.sales, 0),
        // WEEKLY TOTALS
        totalWeeklyCalls: validTeamPerformance.reduce((sum, m) => sum + m.weeklyMetrics.calls, 0),
        totalWeeklySales: validTeamPerformance.reduce((sum, m) => sum + m.weeklyMetrics.sales, 0),
        avgConversion:
          validTeamPerformance.length > 0
            ? validTeamPerformance.reduce(
              (sum, m) => sum + m.performanceMetrics.conversionRate,
              0
            ) / validTeamPerformance.length
            : 0,
        totalRawNew: validTeamPerformance.reduce(
          (sum, m) => sum + (m.weeklyMetrics.rawNew || 0),
          0
        ),
        totalMultiLine: validTeamPerformance.reduce(
          (sum, m) => sum + (m.weeklyMetrics.multiLine || 0),
          0
        ),
        avgRawNewPercentage:
          validTeamPerformance.length > 0
            ? Math.round(
              validTeamPerformance.reduce(
                (sum, m) => sum + (m.weeklyMetrics.rawNewPercentage || 0),
                0
              ) / validTeamPerformance.length
            )
            : 0,
        avgMultiLinePercentage:
          validTeamPerformance.length > 0
            ? Math.round(
              validTeamPerformance.reduce(
                (sum, m) => sum + (m.weeklyMetrics.multiLinePercentage || 0),
                0
              ) / validTeamPerformance.length
            )
            : 0,
      },
    });
  } catch (error) {
    console.error('Error in team performance:', error);
    return NextResponse.json({ error: 'Failed to fetch team performance' }, { status: 500 });
  }
}
