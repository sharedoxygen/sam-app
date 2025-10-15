import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const dynamic = 'force-dynamic'; // Ensures the route is always dynamically rendered

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    const requestUserIdParam = searchParams.get('userId');
    const includeTeam = searchParams.get('includeTeam') === 'true';

    const sessionUserRole = session.user.role;
    const sessionUserIdInt = parseInt(session.user.id as string);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Build query conditions
    const whereConditions: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // User ID filtering logic
    if (sessionUserRole === 'ADMIN' || sessionUserRole === 'OFFICE_MANAGER') {
      if (requestUserIdParam) {
        const targetUserId = parseInt(requestUserIdParam);
        if (isNaN(targetUserId)) {
          return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
        }
        if (includeTeam) {
          // Admin/OM views a specific manager's team
          const teamUserIds = await getTeamUserIds(targetUserId);
          whereConditions.userId = { in: teamUserIds };
        } else {
          // Admin/OM views a specific user
          whereConditions.userId = targetUserId;
        }
      } else if (includeTeam) {
        // Admin/OM views all relevant users (e.g., all with roles that have activities)
        // This could be refined to specific roles if needed. For now, no user filter means all.
      }
      // If no requestUserIdParam and not includeTeam, Admin/OM sees all users' data (no userId filter)
    } else if (sessionUserRole === 'SALES_LEAD' || sessionUserRole === 'SERVICE_LEAD') {
      if (includeTeam) {
        // Lead views their own team
        const teamUserIds = await getTeamUserIds(sessionUserIdInt);
        whereConditions.userId = { in: teamUserIds };
      } else if (requestUserIdParam) {
        // Lead views a specific user (must be self or direct report)
        const targetUserId = parseInt(requestUserIdParam);
        if (isNaN(targetUserId)) {
          return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
        }
        const allowedUserIds = await getTeamUserIds(sessionUserIdInt); // self + reports
        if (allowedUserIds.includes(targetUserId)) {
          whereConditions.userId = targetUserId;
        } else {
          return NextResponse.json(
            { error: "Forbidden to view this user's report" },
            { status: 403 }
          );
        }
      } else {
        // Lead views their own data by default
        whereConditions.userId = sessionUserIdInt;
      }
    } else {
      // SALES, SERVICE roles
      if (requestUserIdParam) {
        const targetUserId = parseInt(requestUserIdParam);
        if (isNaN(targetUserId) || targetUserId !== sessionUserIdInt) {
          return NextResponse.json(
            { error: "Forbidden to view another user's report" },
            { status: 403 }
          );
        }
        whereConditions.userId = targetUserId; // Should be sessionUserIdInt
      } else {
        whereConditions.userId = sessionUserIdInt;
      }
    }

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where: whereConditions,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Process data for charts
    const activityByType = activities.reduce((acc: any, activity) => {
      if (!acc[activity.type]) {
        acc[activity.type] = 0;
      }
      acc[activity.type]++;
      return acc;
    }, {});

    // Generate time series data
    const timeSeriesData = generateTimeSeries(activities, range, startDate, endDate);

    // Calculate metrics
    const totalActivities = activities.length;
    const avgDuration =
      activities.reduce((sum, a) => sum + (a.duration || 0), 0) / totalActivities || 0;

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);

    switch (range) {
      case 'week':
        prevStartDate.setDate(prevEndDate.getDate() - 7);
        break;
      case 'month':
        prevStartDate.setDate(prevEndDate.getDate() - 30);
        break;
      case 'quarter':
        prevStartDate.setMonth(prevEndDate.getMonth() - 3);
        break;
      case 'year':
        prevStartDate.setFullYear(prevEndDate.getFullYear() - 1);
        break;
    }

    const prevActivities = await prisma.activity.count({
      where: {
        ...whereConditions,
        date: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
    });

    const percentageChange =
      prevActivities > 0 ? ((totalActivities - prevActivities) / prevActivities) * 100 : 0;

    // Get top performers if viewing team
    let topPerformers: any[] = [];
    if (includeTeam) {
      const performerData = activities.reduce((acc: any, activity) => {
        if (!acc[activity.userId]) {
          acc[activity.userId] = {
            user: activity.User,
            count: 0,
            totalDuration: 0,
          };
        }
        acc[activity.userId].count++;
        acc[activity.userId].totalDuration += activity.duration;
        return acc;
      }, {});

      topPerformers = Object.values(performerData)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);
    }

    return NextResponse.json({
      summary: {
        totalActivities,
        avgDuration: Math.round(avgDuration),
        percentageChange: Math.round(percentageChange),
        activityByType,
      },
      timeSeries: timeSeriesData,
      topPerformers,
      period: {
        start: startDate,
        end: endDate,
        range,
      },
    });
  } catch (error) {
    console.error('Error fetching activity report:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

async function getTeamUserIds(managerId: number): Promise<number[]> {
  const managerWithReports = await prisma.user.findUnique({
    where: { id: managerId },
    include: { other_User: { select: { id: true } } },
  });
  if (!managerWithReports) return [managerId]; // Return self if no reports or manager not found
  return [managerId, ...managerWithReports.other_User.map((report) => report.id)];
}

function generateTimeSeries(activities: any[], range: string, startDate: Date, endDate: Date) {
  const data: any = {};

  // Initialize data structure
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = getDateKey(current, range);
    data[key] = {
      date: key,
      call: 0,
      meeting: 0,
      email: 0,
      'follow-up': 0,
      total: 0,
    };

    // Increment date based on range
    if (range === 'week' || range === 'month') {
      current.setDate(current.getDate() + 1);
    } else if (range === 'quarter') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  // Populate with activity data
  activities.forEach((activity: any) => {
    const key = getDateKey(new Date(activity.date), range);
    if (data[key]) {
      data[key][activity.type] = (data[key][activity.type] || 0) + 1;
      data[key].total++;
    }
  });

  return Object.values(data);
}

function getDateKey(date: Date, range: string): string {
  if (range === 'week' || range === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (range === 'quarter') {
    const weekNum = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `Week ${weekNum}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
}
