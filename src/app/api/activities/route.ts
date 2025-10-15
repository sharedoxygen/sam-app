import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import DataIntegrityService from '@/lib/services/dataIntegrityService';

export const dynamic = 'force-dynamic';

// Helper function to get IDs of users a lead can view (self + direct reports)
async function getAllowedUserIdsForLead(leadUserId: number): Promise<number[]> {
  const leadWithReports = await prisma.user.findUnique({
    where: { id: leadUserId },
    include: { other_User: { select: { id: true } } },
  });
  if (!leadWithReports) {
    return [leadUserId]; // Should not happen if leadUserId is from a valid session
  }
  return [leadUserId, ...leadWithReports.other_User.map((report) => report.id)];
}

// Type definitions for the new activity data structure
type DayActivities = {
  closed: {
    auto: number;
    lifeHealth: number;
    fire: number;
  };
  quotes: number;
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

type ActivityDataEntry = {
  id?: string;
  userId: string;
  date: string;
  weekStartDate: string;
  data: WeeklyActivityData;
  lastModified: string;
  createdAt: string;
};

// GET /api/activities - Get activities with enhanced filtering
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserRole = session.user.role;
  const sessionUserIdInt = parseInt(sessionUserId, 10);

  try {
    const { searchParams } = new URL(request.url);

    // Check if this is a request for the new weekly activity data structure
    const isWeeklyData = searchParams.get('type') === 'weekly';

    if (isWeeklyData) {
      // Handle weekly activity data requests
      const date = searchParams.get('date');
      const startDate = searchParams.get('start');
      const endDate = searchParams.get('end');
      const requestUserId = searchParams.get('userId') || sessionUserId;
      const requestUserIdInt = parseInt(requestUserId, 10);

      // Authorization check
      if (sessionUserRole === Role.ADMIN || sessionUserRole === Role.OFFICE_MANAGER) {
        // Admins/OMs can view any user data, no specific check needed here beyond initial session check
      } else if (sessionUserRole === Role.SALES_LEAD || sessionUserRole === Role.SERVICE_LEAD) {
        if (isNaN(requestUserIdInt)) {
          return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
        }
        const allowedIds = await getAllowedUserIdsForLead(sessionUserIdInt);
        if (!allowedIds.includes(requestUserIdInt)) {
          return NextResponse.json(
            { error: 'Forbidden: Lead can only view their own or team member weekly activities.' },
            { status: 403 }
          );
        }
      } else {
        // SALES, SERVICE, or other roles
        if (requestUserId !== sessionUserId) {
          return NextResponse.json(
            { error: 'Forbidden: Can only view own weekly activities.' },
            { status: 403 }
          );
        }
      }

      if (date) {
        // Get specific date's weekly data
        const weeklyActivity = await prisma.weeklyActivity.findFirst({
          where: {
            userId: parseInt(requestUserId),
            date: new Date(date),
          },
        });

        if (!weeklyActivity) {
          return NextResponse.json(null);
        }

        const response: ActivityDataEntry = {
          id: weeklyActivity.id.toString(),
          userId: requestUserId,
          date: weeklyActivity.date.toISOString().split('T')[0],
          weekStartDate: weeklyActivity.weekStartDate.toISOString().split('T')[0],
          data: weeklyActivity.data as WeeklyActivityData,
          lastModified: weeklyActivity.updatedAt.toISOString(),
          createdAt: weeklyActivity.createdAt.toISOString(),
        };

        return NextResponse.json(response);
      } else if (startDate && endDate) {
        // Get date range
        const weeklyActivities = await prisma.weeklyActivity.findMany({
          where: {
            userId: parseInt(requestUserId),
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

        const response: ActivityDataEntry[] = weeklyActivities.map((activity) => ({
          id: activity.id.toString(),
          userId: requestUserId,
          date: activity.date.toISOString().split('T')[0],
          weekStartDate: activity.weekStartDate.toISOString().split('T')[0],
          data: activity.data as WeeklyActivityData,
          lastModified: activity.updatedAt.toISOString(),
          createdAt: activity.createdAt.toISOString(),
        }));

        return NextResponse.json(response);
      }

      return NextResponse.json(
        { error: 'Date or date range required for weekly data' },
        { status: 400 }
      );
    }

    // Original activity handling for backward compatibility
    const page = parseInt(searchParams.get('page') || '1', 10);
    const requestLimit = searchParams.get('limit');
    const limit = requestLimit ? parseInt(requestLimit, 10) : 100;
    const skip = (page - 1) * limit;

    const date = searchParams.get('date');
    const requestUserIdParam = searchParams.get('userId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Authorization and filtering logic
    if (sessionUserRole === Role.ADMIN || sessionUserRole === Role.OFFICE_MANAGER) {
      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (!isNaN(parsedRequestUserId)) {
          where.userId = parsedRequestUserId;
        }
      } // If no param, Admin/OM sees all
    } else if (sessionUserRole === Role.SALES_LEAD || sessionUserRole === Role.SERVICE_LEAD) {
      const allowedIds = await getAllowedUserIdsForLead(sessionUserIdInt);
      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (isNaN(parsedRequestUserId)) {
          return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
        }
        if (allowedIds.includes(parsedRequestUserId)) {
          where.userId = parsedRequestUserId;
        } else {
          return NextResponse.json(
            { error: 'Forbidden: Lead can only view their own or team member activities.' },
            { status: 403 }
          );
        }
      } else {
        // No specific userId requested by lead, so fetch for self and all reports
        where.userId = { in: allowedIds };
      }
    } else {
      // SALES, SERVICE, or other roles
      // Default to own data. If requestUserIdParam is present, it must match sessionUserId.
      const targetId = requestUserIdParam ? parseInt(requestUserIdParam, 10) : sessionUserIdInt;
      if (isNaN(targetId) || targetId !== sessionUserIdInt) {
        return NextResponse.json(
          { error: 'Forbidden: Can only view own activities.' },
          { status: 403 }
        );
      }
      where.userId = sessionUserIdInt;
    }

    if (date) {
      // Fix timezone issue - parse date as UTC to avoid timezone conversion
      const targetDate = new Date(date + 'T00:00:00.000Z');
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      where.date = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    if (startDate && endDate) {
      // Fix timezone issue - parse dates as UTC to avoid timezone conversion
      where.date = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    if (type) {
      where.type = type;
    }

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
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
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      activities,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST /api/activities - Create or update weekly activity data
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);

  try {
    const body: ActivityDataEntry = await request.json();
    const { userId, date, weekStartDate, data } = body;

    // Authorization check
    if (
      userId !== sessionUserId &&
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate data structure
    if (!data || !date || !weekStartDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fix timezone issues - parse dates as UTC
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const weekStart = new Date(weekStartDate + 'T00:00:00.000Z');

    // **DATA INTEGRITY ENFORCEMENT**: Use DataIntegrityService for data quality
    const weeklyActivity = await DataIntegrityService.updateWeeklyActivityWithIntegrity(
      userIdInt,
      targetDate,
      data
    );

    const response: ActivityDataEntry = {
      id: weeklyActivity.id.toString(),
      userId,
      date: weeklyActivity.date.toISOString().split('T')[0],
      weekStartDate: weeklyActivity.weekStartDate.toISOString().split('T')[0],
      data: weeklyActivity.data as WeeklyActivityData,
      lastModified: weeklyActivity.updatedAt.toISOString(),
      createdAt: weeklyActivity.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving weekly activity:', error);
    return NextResponse.json({ error: 'Failed to save activity data' }, { status: 500 });
  }
}
