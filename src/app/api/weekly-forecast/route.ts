import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Weekly forecast data structure
type WeeklyForecast = {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
};

type WeeklyForecastEntry = {
  id?: string;
  userId: string;
  weekStartDate: string;
  forecast: WeeklyForecast;
  lastModified: string;
  createdAt: string;
};

// Helper function to get IDs of users a lead can view/edit (self + direct reports)
async function getAllowedUserIdsForLeadForecast(leadUserId: number): Promise<number[]> {
  const leadWithReports = await prisma.user.findUnique({
    where: { id: leadUserId },
    include: { other_User: { select: { id: true } } },
  });
  if (!leadWithReports) {
    return [leadUserId];
  }
  return [leadUserId, ...leadWithReports.other_User.map((report) => report.id)];
}

// GET /api/weekly-forecast - Get weekly forecast data
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('weekStartDate');
    const requestUserId = searchParams.get('userId') || sessionUserId;

    // Authorization check
    if (
      requestUserId !== sessionUserId &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'OFFICE_MANAGER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!weekStartDate) {
      return NextResponse.json({ error: 'Week start date required' }, { status: 400 });
    }

    // Get forecast for specific week
    const forecast = await prisma.weeklyForecast.findFirst({
      where: {
        userId: parseInt(requestUserId),
        weekStartDate: new Date(weekStartDate),
      },
    });

    if (!forecast) {
      // Return default empty forecast
      const defaultForecast: WeeklyForecastEntry = {
        userId: requestUserId,
        weekStartDate,
        forecast: {
          peopleContacted: 0,
          lifeSalesConversations: 0,
          sales: 0,
          referralRequests: 0,
        },
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json(defaultForecast);
    }

    const response: WeeklyForecastEntry = {
      id: forecast.id.toString(),
      userId: requestUserId,
      weekStartDate: forecast.weekStartDate.toISOString().split('T')[0],
      forecast: forecast.forecast as WeeklyForecast,
      lastModified: forecast.updatedAt.toISOString(),
      createdAt: forecast.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching weekly forecast:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly forecast' }, { status: 500 });
  }
}

// POST /api/weekly-forecast - Create or update weekly forecast
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserRole = session.user.role;
  const sessionUserIdInt = parseInt(sessionUserId, 10);

  try {
    const body: WeeklyForecastEntry = await request.json();
    const { userId, weekStartDate, forecast } = body;
    const targetUserIdInt = parseInt(userId, 10);

    if (isNaN(targetUserIdInt)) {
      return NextResponse.json({ error: 'Invalid target user ID' }, { status: 400 });
    }

    // Authorization checks
    if (sessionUserRole === Role.ADMIN || sessionUserRole === Role.OFFICE_MANAGER) {
      // Admins/OMs can create/update for any user
    } else if (sessionUserRole === Role.SALES_LEAD || sessionUserRole === Role.SERVICE_LEAD) {
      if (targetUserIdInt !== sessionUserIdInt) {
        const allowedIds = await getAllowedUserIdsForLeadForecast(sessionUserIdInt);
        if (!allowedIds.includes(targetUserIdInt)) {
          return NextResponse.json(
            {
              error:
                'Forbidden: Leads can only manage forecasts for themselves or their direct reports.',
            },
            { status: 403 }
          );
        }
      }
    } else {
      if (targetUserIdInt !== sessionUserIdInt) {
        return NextResponse.json(
          { error: 'Forbidden: Users can only manage their own forecasts.' },
          { status: 403 }
        );
      }
    }

    // Validate data
    if (!forecast || !weekStartDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserIdInt },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const weekStart = new Date(weekStartDate);

    // Upsert weekly forecast
    const weeklyForecast = await prisma.weeklyForecast.upsert({
      where: {
        userId_weekStartDate: {
          userId: targetUserIdInt,
          weekStartDate: weekStart,
        },
      },
      update: {
        forecast: forecast as any,
        updatedAt: new Date(),
      },
      create: {
        userId: targetUserIdInt,
        weekStartDate: weekStart,
        forecast: forecast as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const response: WeeklyForecastEntry = {
      id: weeklyForecast.id.toString(),
      userId,
      weekStartDate: weeklyForecast.weekStartDate.toISOString().split('T')[0],
      forecast: weeklyForecast.forecast as WeeklyForecast,
      lastModified: weeklyForecast.updatedAt.toISOString(),
      createdAt: weeklyForecast.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving weekly forecast:', error);
    return NextResponse.json({ error: 'Failed to save weekly forecast' }, { status: 500 });
  }
}
