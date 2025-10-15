import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface CreateNotificationRequest {
  title: string;
  message: string;
  type: 'MAINTENANCE' | 'FEATURE' | 'UPDATE' | 'ANNOUNCEMENT' | 'ALERT' | 'GENERAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetRoles: string[];
  expiresAt?: string;
}

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRead = searchParams.get('includeRead') === 'true';
    const adminView = searchParams.get('admin') === 'true';

    // Check if user is admin for admin view
    if (adminView) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { role: true },
      });

      if (!user || (user.role !== Role.ADMIN && user.role !== Role.OFFICE_MANAGER)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Admin view - get all notifications with read counts
      const notifications = await prisma.systemNotification.findMany({
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      // Get read counts for each notification
      const notificationsWithReadCounts = await Promise.all(
        notifications.map(async (notification) => {
          const readCount = await prisma.systemNotificationRead.count({
            where: { notificationId: notification.id },
          });

          const totalUsers = await prisma.user.count({
            where: {
              isActive: true,
              ...(notification.targetRoles.length > 0
                ? {
                    role: { in: notification.targetRoles as Role[] },
                  }
                : {}),
            },
          });

          return {
            ...notification,
            readCount,
            totalUsers,
            readPercentage: totalUsers > 0 ? Math.round((readCount / totalUsers) * 100) : 0,
          };
        })
      );

      return NextResponse.json({ notifications: notificationsWithReadCounts });
    }

    // User view - get notifications for current user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause for user notifications
    const where: any = {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      AND: [
        {
          OR: [
            { targetRoles: { isEmpty: true } }, // No target roles = all users
            { targetRoles: { has: user.role } }, // User's role is in target roles
          ],
        },
      ],
    };

    // If not including read notifications, exclude already read ones
    if (!includeRead) {
      const readNotificationIds = await prisma.systemNotificationRead.findMany({
        where: { userId: parseInt(session.user.id) },
        select: { notificationId: true },
      });

      if (readNotificationIds.length > 0) {
        where.AND.push({
          id: { notIn: readNotificationIds.map((r) => r.notificationId) },
        });
      }
    }

    const notifications = await prisma.systemNotification.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    // Check which notifications user has read
    const readNotifications = await prisma.systemNotificationRead.findMany({
      where: {
        userId: parseInt(session.user.id),
        notificationId: { in: notifications.map((n) => n.id) },
      },
    });

    const readNotificationIds = new Set(readNotifications.map((r) => r.notificationId));

    const notificationsWithReadStatus = notifications.map((notification) => ({
      ...notification,
      isRead: readNotificationIds.has(notification.id),
    }));

    return NextResponse.json({ notifications: notificationsWithReadStatus });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create new system notification (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.OFFICE_MANAGER)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body: CreateNotificationRequest = await request.json();
    const { title, message, type, priority, targetRoles, expiresAt } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (
      !type ||
      !['MAINTENANCE', 'FEATURE', 'UPDATE', 'ANNOUNCEMENT', 'ALERT', 'GENERAL'].includes(type)
    ) {
      return NextResponse.json({ error: 'Valid notification type is required' }, { status: 400 });
    }

    if (!priority || !['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
      return NextResponse.json({ error: 'Valid priority is required' }, { status: 400 });
    }

    // Validate target roles if provided
    if (targetRoles && targetRoles.length > 0) {
      const validRoles = Object.values(Role);
      const invalidRoles = targetRoles.filter((role) => !validRoles.includes(role as Role));

      if (invalidRoles.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid roles: ${invalidRoles.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Parse expiration date if provided - fix timezone issue
    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt + 'T00:00:00.000Z');
      if (isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 });
      }

      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );
      if (parsedExpiresAt <= todayUTC) {
        return NextResponse.json(
          { error: 'Expiration date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Create notification
    const notification = await prisma.systemNotification.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        targetRoles: targetRoles || [],
        expiresAt: parsedExpiresAt,
        createdById: parseInt(session.user.id),
      },
    });

    // Log notification creation
    console.log('System notification created:', {
      notificationId: notification.id,
      title: notification.title,
      type: notification.type,
      priority: notification.priority,
      targetRoles: notification.targetRoles,
      createdBy: session.user.id,
      createdByName: session.user.name,
    });

    return NextResponse.json({
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        title: notification.title,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
