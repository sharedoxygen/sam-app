import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface CreateResponseRequest {
  message: string;
  isInternal?: boolean;
}

// GET /api/feedback/[id]/responses - Get responses for a feedback item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const feedbackId = parseInt(params.id);
    if (isNaN(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    // Get the feedback item to check permissions
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: { userId: true },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Check permissions: users can view responses to their own feedback, admins can view all
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.OFFICE_MANAGER;
    const isOwner = feedback.userId === parseInt(session.user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get responses - filter internal notes if user is not admin
    const responses = await prisma.feedbackResponse.findMany({
      where: {
        feedbackId,
        ...(isOwner && !isAdmin ? { isInternal: false } : {}), // Hide internal notes from non-admin users
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get admin details for responses
    const adminIds = Array.from(new Set(responses.map((r: any) => r.adminId)));
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true, role: true },
    });

    const adminMap = new Map(admins.map((admin) => [admin.id, admin]));

    const responsesWithAdminInfo = responses.map((response: any) => ({
      ...response,
      admin: adminMap.get(response.adminId),
    }));

    return NextResponse.json({ responses: responsesWithAdminInfo });
  } catch (error) {
    console.error('Error fetching feedback responses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/feedback/[id]/responses - Create response to feedback (Admin only)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const feedbackId = parseInt(params.id);
    if (isNaN(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.OFFICE_MANAGER)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if feedback exists
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const body: CreateResponseRequest = await request.json();
    const { message, isInternal = false } = body;

    // Validate required fields
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.trim().length < 5) {
      return NextResponse.json({ error: 'Message must be at least 5 characters' }, { status: 400 });
    }

    // Create response
    const response = await prisma.feedbackResponse.create({
      data: {
        feedbackId,
        adminId: parseInt(session.user.id),
        message: message.trim(),
        isInternal: Boolean(isInternal),
      },
    });

    // Log response creation
    console.log('Feedback response created:', {
      responseId: response.id,
      feedbackId,
      adminId: session.user.id,
      adminName: session.user.name,
      isInternal: response.isInternal,
      feedbackTitle: feedback.name,
      feedbackUser: feedback.User.name,
    });

    // Get admin info for response
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({
      message: 'Response created successfully',
      response: {
        ...response,
        admin,
      },
    });
  } catch (error) {
    console.error('Error creating feedback response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
