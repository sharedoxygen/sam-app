import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { FeedbackType } from '@prisma/client';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface FeedbackUpdateRequest {
  name?: string;
  pageTitle?: string;
  type?: FeedbackType;
  description?: string;
  status?: 'OPEN' | 'CLOSED' | 'REVIEW' | 'IMPLEMENTED' | 'IN_PROGRESS'; // Only admins can update status
}

// GET /api/feedback/[id] - Get single feedback item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feedbackId = parseInt(params.id);
    if (isNaN(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Check permissions: users can view their own feedback, admins can view all
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = feedback.userId === parseInt(session.user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/feedback/[id] - Update feedback item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feedbackId = parseInt(params.id);
    if (isNaN(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, pageTitle, type, description, status } = body;

    // Get existing feedback first
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = existingFeedback.userId === parseInt(session.user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For admin status-only updates (feedback management page)
    if (isAdmin && status && !name && !pageTitle && !type && !description) {
      // Validate status
      if (!['OPEN', 'CLOSED', 'REVIEW', 'IMPLEMENTED', 'IN_PROGRESS'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const updatedFeedback = await prisma.feedback.update({
        where: { id: feedbackId },
        data: { status },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        feedback: updatedFeedback,
      });
    }

    // For full feedback updates (user editing their own feedback)
    // Validate required fields are present and not empty
    if (!name?.trim() || !pageTitle?.trim() || !type || !description?.trim()) {
      return NextResponse.json(
        {
          error: 'All fields (name, pageTitle, type, description) are required and cannot be empty',
        },
        { status: 400 }
      );
    }

    // Validate type
    if (!['ENHANCEMENT', 'BUG', 'GENERAL'].includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['OPEN', 'CLOSED', 'REVIEW', 'IMPLEMENTED', 'IN_PROGRESS'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      pageTitle: pageTitle.trim(),
      type,
      description: description.trim(),
    };

    // Only admins can update status
    if (status && isAdmin) {
      updateData.status = status;
    }

    // Update feedback
    const updatedFeedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/feedback/[id] - Delete feedback item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feedbackId = parseInt(params.id);
    if (isNaN(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    // Check if feedback exists and check permissions
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = feedback.userId === parseInt(session.user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete feedback
    await prisma.feedback.delete({
      where: { id: feedbackId },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
