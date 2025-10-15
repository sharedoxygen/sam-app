import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

// Force dynamic rendering to prevent static generation errors with headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface FeedbackRequest {
  name: string;
  pageTitle: string;
  type: 'ENHANCEMENT' | 'BUG' | 'GENERAL';
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    const body: FeedbackRequest = await request.json();

    // Validate required fields
    const { name, pageTitle, type, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!pageTitle?.trim()) {
      return NextResponse.json({ error: 'Page title is required' }, { status: 400 });
    }

    if (!type || !['ENHANCEMENT', 'BUG', 'GENERAL'].includes(type)) {
      return NextResponse.json({ error: 'Valid feedback type is required' }, { status: 400 });
    }

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Create feedback record
    const feedback = await prisma.feedback.create({
      data: {
        userId: parseInt(session.user.id),
        name: name.trim(),
        pageTitle: pageTitle.trim(),
        type,
        description: description.trim(),
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log feedback submission for monitoring
    console.log('Feedback submitted:', {
      feedbackId: feedback.id,
      userId: session.user.id,
      userName: session.user.name,
      type: feedback.type,
      pageTitle: feedback.pageTitle,
      timestamp: feedback.createdAt,
    });

    return NextResponse.json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        pageTitle: feedback.pageTitle,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);

    // Handle Prisma errors
    if (error instanceof Error && error.message.includes('Prisma')) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const myFeedback = searchParams.get('my') === 'true';

    // Check permissions: admins/office managers can view all, users can only view their own
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If requesting own feedback, any authenticated user can access
    if (myFeedback) {
      // Build where clause for user's own feedback
      const whereMyFeedback: any = {
        userId: parseInt(session.user.id),
      };

      if (type && ['ENHANCEMENT', 'BUG', 'GENERAL'].includes(type)) {
        whereMyFeedback.type = type;
      }

      // Force to current user's feedback only
      const feedback = await prisma.feedback.findMany({
        where: whereMyFeedback,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.feedback.count({
        where: whereMyFeedback,
      });

      return NextResponse.json({
        feedback,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    // For all other requests, check admin permissions
    if (user.role !== Role.ADMIN && user.role !== Role.OFFICE_MANAGER) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Build where clause for admin/office manager access
    const where: any = {};
    if (type && ['ENHANCEMENT', 'BUG', 'GENERAL'].includes(type)) {
      where.type = type;
    }
    if (userId) {
      const parsedUserId = parseInt(userId);
      if (!isNaN(parsedUserId)) {
        where.userId = parsedUserId;
      }
    }

    // Get feedback with pagination
    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
