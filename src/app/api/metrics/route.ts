import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/metrics - Get aggregated metrics with filtering options
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = parseInt(session.user.id as string, 10);
  if (isNaN(sessionUserId)) {
    return NextResponse.json({ error: 'Invalid user ID in session' }, { status: 400 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const requestUserIdParam = searchParams.get('userId');
    const groupBy = searchParams.get('groupBy') || 'day'; // 'day', 'week', 'month'

    // Build date filters
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build where clause
    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    // User filter - Authorization Logic Start
    if (session.user.role === Role.ADMIN || session.user.role === Role.OFFICE_MANAGER) {
      if (requestUserIdParam) {
        const parsedUserId = parseInt(requestUserIdParam, 10);
        if (!isNaN(parsedUserId)) {
          where.userId = parsedUserId;
        }
      }
      // If admin/office_manager and no userId param, fetches all users' activities (within other filters)
    } else if (session.user.role === Role.SALES_LEAD || session.user.role === Role.SERVICE_LEAD) {
      const currentUserWithReports = await prisma.user.findUnique({
        where: { id: sessionUserId },
        include: { other_User: { select: { id: true } } },
      });

      if (!currentUserWithReports) {
        return NextResponse.json({ error: 'Lead user not found' }, { status: 404 });
      }

      const reportIds = currentUserWithReports.other_User.map(
        (report: { id: number }) => report.id
      );
      const allowedUserIds = [sessionUserId, ...reportIds];

      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (isNaN(parsedRequestUserId)) {
          return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
        }
        if (allowedUserIds.includes(parsedRequestUserId)) {
          where.userId = parsedRequestUserId;
        } else {
          return NextResponse.json(
            { error: "Forbidden: You can only view your own or your direct reports' metrics." },
            { status: 403 }
          );
        }
      } else {
        where.userId = { in: allowedUserIds };
      }
    } else {
      // Other roles (e.g., SALES, SERVICE)
      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (isNaN(parsedRequestUserId) || parsedRequestUserId !== sessionUserId) {
          return NextResponse.json(
            { error: 'Forbidden: You can only view your own metrics.' },
            { status: 403 }
          );
        }
        where.userId = sessionUserId;
      } else {
        where.userId = sessionUserId;
      }
    }
    // User filter - Authorization Logic End

    // Fetch activities with filters
    const activities = await prisma.activity.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // Aggregate metrics based on type
    const typeCount = activities.reduce((acc: any, activity) => {
      const type = activity.type;
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {});

    // Group activities by date according to groupBy parameter
    type ActivityGroup = {
      date: string;
      calls: number;
      meetings: number;
      followUps: number;
      emails: number;
    };

    const groupedActivities = activities.reduce<Record<string, ActivityGroup>>(
      (acc, activity) => {
        let key = '';

        const activityDate = new Date(activity.date);

        if (groupBy === 'day') {
          key = activityDate.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (groupBy === 'week') {
          // Get the week number
          const d = new Date(activityDate);
          const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
          const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          key = `${d.getFullYear()}-W${weekNum}`;
        } else if (groupBy === 'month') {
          key = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
        }

        if (key && !acc[key]) {
          acc[key] = {
            date: key,
            calls: 0,
            meetings: 0,
            followUps: 0,
            emails: 0,
          };
        }

        if (!key) {
          return acc;
        }

        // Increment the appropriate counter
        switch (activity.type.toLowerCase()) {
          case 'call':
            acc[key].calls++;
            break;
          case 'meeting':
            acc[key].meetings++;
            break;
          case 'follow-up':
            acc[key].followUps++;
            break;
          case 'email':
            acc[key].emails++;
            break;
        }

        return acc;
      },
      {} as Record<string, ActivityGroup>
    );

    // Convert grouped activities to array for easier client-side processing
    const timeSeriesData = Object.values(groupedActivities);

    // Get total counts
    const totals = {
      calls: activities.filter((a) => a.type.toLowerCase() === 'call').length,
      meetings: activities.filter((a) => a.type.toLowerCase() === 'meeting').length,
      followUps: activities.filter((a) => a.type.toLowerCase() === 'follow-up').length,
      emails: activities.filter((a) => a.type.toLowerCase() === 'email').length,
      total: activities.length,
    };

    return NextResponse.json({
      summary: {
        totalActivities: activities.length,
        byType: typeCount,
        totals,
      },
      timeSeries: timeSeriesData,
      rawData: activities,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
