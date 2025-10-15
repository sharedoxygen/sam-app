import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/notifications/[id]/read - Mark notification as read
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const notificationId = parseInt(params.id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Check if notification exists and is active
    const notification = await prisma.systemNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (!notification.isActive) {
      return NextResponse.json({ error: 'Notification is no longer active' }, { status: 400 });
    }

    // Check if notification has expired
    if (notification.expiresAt && notification.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Notification has expired' }, { status: 400 });
    }

    // Mark as read (upsert to handle duplicate reads)
    await prisma.systemNotificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId: parseInt(session.user.id),
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        notificationId,
        userId: parseInt(session.user.id),
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id]/read - Unmark notification as read
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const notificationId = parseInt(params.id);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Remove read status
    await prisma.systemNotificationRead.deleteMany({
      where: {
        notificationId,
        userId: parseInt(session.user.id),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification marked as unread',
    });
  } catch (error) {
    console.error('Error unmarking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
