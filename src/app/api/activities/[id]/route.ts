import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/activities/:id - Get a specific activity
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activityId = parseInt(params.id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
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

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    let isAllowed = false;

    if (activity.userId === sessionUserId) {
      // Owner can always access
      isAllowed = true;
    } else if (session.user.role === Role.ADMIN) {
      // Admin can always access
      isAllowed = true;
    } else if (session.user.role === Role.SALES_LEAD || session.user.role === Role.SERVICE_LEAD) {
      // Check if the activity's user is a report of the current lead
      const leadWithReports = await prisma.user.findUnique({
        where: { id: sessionUserId },
        include: { other_User: { select: { id: true } } }, // Select only IDs
      });
      // Ensure leadWithReports and its reports property are not null/undefined
      if (
        leadWithReports &&
        leadWithReports.other_User &&
        leadWithReports.other_User.some((report: { id: number }) => report.id === activity.userId)
      ) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// PATCH /api/activities/:id - Update an activity
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activityId = parseInt(params.id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    // Fetch activity to check ownership before update
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (activity.userId !== sessionUserId && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Format the date and time into a proper DateTime
    let dateTime;
    if (data.date && data.time) {
      dateTime = new Date(`${data.date}T${data.time}`);
      if (isNaN(dateTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date or time format for update' },
          { status: 400 }
        );
      }
    }

    // Remove date and time from data - we'll use the combined dateTime
    const { date, time, ...restData } = data;

    // Update the activity
    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        ...restData,
        ...(dateTime && { date: dateTime }),
      },
    });

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    // Prisma's P2025 code indicates record to update not found, which is covered by the explicit check above.
    // However, keeping it as a fallback for other potential update issues.
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Activity not found during update attempt' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

// DELETE /api/activities/:id - Delete an activity
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activityId = parseInt(params.id, 10);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    // Fetch activity to check ownership before delete
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (activity.userId !== sessionUserId && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.activity.delete({
      where: { id: activityId },
    });

    return NextResponse.json({ message: 'Activity deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting activity:', error);
    // Prisma's P2025 code indicates record to delete not found, covered by explicit check.
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Activity not found during delete attempt' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}
