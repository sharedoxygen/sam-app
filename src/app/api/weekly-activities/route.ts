import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { DataIntegrityService } from '@/lib/services/dataIntegrityService';

export const dynamic = 'force-dynamic';

// Type definitions for the weekly activity data structure
type DayActivities = {
  closed: {
    auto: number;
    lifeHealth: number;
    fire: number;
    // Track which sales had indicators
    autoRawNew?: number; // Count of auto sales that were Raw New
    autoMultiLine?: number; // Count of auto sales that were Multi-line
    lifeHealthRawNew?: number;
    lifeHealthMultiLine?: number;
    fireRawNew?: number;
    fireMultiLine?: number;
  };
  quotes: number;
  quotesRawNew?: number; // Count of quotes that were Raw New
  quotesMultiLine?: number; // Count of quotes that were Multi-line
  dials: number;
  referrals: {
    ask: number;
    received: number;
  };
  // New indicators for records
  rawNew: number; // Raw New (RN) indicator count
  multiLine: number; // Multi-line indicator count
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

// GET /api/weekly-activities - Get weekly activity data
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserIdInt = parseInt(sessionUserId);

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const requestUserId = searchParams.get('userId') || sessionUserId;

    // Determine if the user can access the requested data
    let canAccess = false;

    if (requestUserId === sessionUserId) {
      // Users can always access their own data
      canAccess = true;
    } else if (session.user.role === 'ADMIN' || session.user.role === 'OFFICE_MANAGER') {
      // Admins and office managers can access all data
      canAccess = true;
    } else if (session.user.role === 'SALES_LEAD' || session.user.role === 'SERVICE_LEAD') {
      // Lead roles can access data for agents assigned to them
      const requestedUser = await prisma.user.findUnique({
        where: { id: parseInt(requestUserId) },
        select: { managerId: true, role: true },
      });

      if (requestedUser?.managerId === sessionUserIdInt) {
        // Check if the lead is managing an agent of their department
        if (
          (session.user.role === 'SALES_LEAD' && requestedUser.role === 'SALES') ||
          (session.user.role === 'SERVICE_LEAD' && requestedUser.role === 'SERVICE')
        ) {
          canAccess = true;
        }
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (date) {
      // Get specific date's weekly data
      const weeklyActivity = await prisma.weeklyActivity.findFirst({
        where: {
          userId: parseInt(requestUserId),
          date: new Date(date),
        },
      });

      if (weeklyActivity) {
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
      }

      // **ENHANCED FALLBACK**: Try to find weekly activity by week start date first
      // Fix timezone issue - parse date as UTC
      const targetDate = new Date(date + 'T00:00:00.000Z');
      const weekStart = new Date(targetDate);
      const dayOfWeek = weekStart.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday (0) correctly
      weekStart.setUTCDate(weekStart.getUTCDate() + daysToMonday);
      weekStart.setUTCHours(0, 0, 0, 0);

      // Try to find existing weekly activity by week start date
      const weeklyActivityByWeekStart = await prisma.weeklyActivity.findFirst({
        where: {
          userId: parseInt(requestUserId),
          weekStartDate: weekStart,
        },
      });

      if (weeklyActivityByWeekStart) {
        console.log(`✅ Found WeeklyActivity by week start date for ${requestUserId} on ${date}`);
        const response: ActivityDataEntry = {
          id: weeklyActivityByWeekStart.id.toString(),
          userId: requestUserId,
          date: weeklyActivityByWeekStart.date.toISOString().split('T')[0],
          weekStartDate: weeklyActivityByWeekStart.weekStartDate.toISOString().split('T')[0],
          data: weeklyActivityByWeekStart.data as WeeklyActivityData,
          lastModified: weeklyActivityByWeekStart.updatedAt.toISOString(),
          createdAt: weeklyActivityByWeekStart.createdAt.toISOString(),
        };
        return NextResponse.json(response);
      }

      // **DATA INTEGRITY FIX**: Fallback to Activity table aggregation when no WeeklyActivity exists
      console.log(
        `📊 No WeeklyActivity found for ${requestUserId} on ${date}, falling back to Activity aggregation`
      );

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);

      // Get activities for the week from Activity table
      const activities = await prisma.activity.findMany({
        where: {
          userId: parseInt(requestUserId),
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        select: {
          id: true,
          type: true,
          date: true,
          notes: true,
        },
        orderBy: { date: 'asc' },
      });

      if (activities.length === 0) {
        return NextResponse.json(null);
      }

      // **AGGREGATE ACTIVITIES INTO WEEKLY FORMAT**: Same logic as dashboard uses
      const aggregatedData: WeeklyActivityData = {
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

      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];

      activities.forEach((activity) => {
        const activityDate = new Date(activity.date);
        const dayOfWeek = activityDate.getDay();
        const dayName = dayNames[dayOfWeek];

        // Only process weekdays
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayData = aggregatedData[dayName as keyof WeeklyActivityData];

          switch (activity.type) {
            case 'CALL':
              dayData.dials++;
              break;
            case 'QUOTE':
              dayData.quotes++;
              break;
            case 'SALE':
              // Parse insurance type from notes if available
              const notes = activity.notes?.toLowerCase() || '';
              if (notes.includes('auto')) {
                dayData.closed.auto++;
              } else if (notes.includes('life') || notes.includes('health')) {
                dayData.closed.lifeHealth++;
              } else if (notes.includes('fire') || notes.includes('property')) {
                dayData.closed.fire++;
              } else {
                // Default to auto if no specific type mentioned
                dayData.closed.auto++;
              }
              break;
            case 'FOLLOW_UP':
              if (activity.notes?.toLowerCase().includes('referral')) {
                dayData.referrals.ask++;
              }
              break;
            case 'MEETING':
              dayData.dials++; // Count meetings as client contact
              break;
          }
        }
      });

      // Create fallback response
      const fallbackResponse: ActivityDataEntry = {
        userId: requestUserId,
        date: targetDate.toISOString().split('T')[0],
        weekStartDate: weekStart.toISOString().split('T')[0],
        data: aggregatedData,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json(fallbackResponse);
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

    return NextResponse.json({ error: 'Date or date range required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching weekly activities:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly activities' }, { status: 500 });
  }
}

// POST /api/weekly-activities - Create or update weekly activity data
export async function POST(request: NextRequest) {
  console.log(
    '📝 POST /api/weekly-activities - Date validation removed for timezone compatibility'
  );
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserIdInt = parseInt(sessionUserId);

  try {
    const body: ActivityDataEntry = await request.json();
    const { userId, date, weekStartDate, data } = body;

    console.log(`📅 Received date: ${date}, weekStartDate: ${weekStartDate}`);

    // Determine if the user can modify the requested data
    let canModify = false;

    if (userId === sessionUserId) {
      // Users can always modify their own data
      canModify = true;
    } else if (session.user.role === 'ADMIN' || session.user.role === 'OFFICE_MANAGER') {
      // Admins and office managers can modify all data
      canModify = true;
    } else if (session.user.role === 'SALES_LEAD' || session.user.role === 'SERVICE_LEAD') {
      // Lead roles can modify data for agents assigned to them
      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { managerId: true, role: true },
      });

      if (targetUser?.managerId === sessionUserIdInt) {
        // Check if the lead is managing an agent of their department
        if (
          (session.user.role === 'SALES_LEAD' && targetUser.role === 'SALES') ||
          (session.user.role === 'SERVICE_LEAD' && targetUser.role === 'SERVICE')
        ) {
          canModify = true;
        }
      }
    }

    if (!canModify) {
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

    // Note: We're not restricting future dates because timezone differences
    // can make "today" appear as "tomorrow" in UTC, causing false rejections.
    // Users should be able to enter data for their local "today" regardless of timezone.

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fix timezone issue - parse date as UTC
    const targetDate = new Date(date + 'T00:00:00.000Z');

    // **DATA INTEGRITY ENFORCEMENT**: Use DataIntegrityService as mandated by AI_MASTER_PROMPT.md
    const weeklyActivity = await DataIntegrityService.updateWeeklyActivityWithIntegrity(
      userIdInt,
      targetDate,
      data,
      sessionUserIdInt // Include audit user ID
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
