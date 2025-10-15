import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/tasks - Get all tasks with filtering options
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
    const requestUserIdParam = searchParams.get('userId'); // User ID from query param
    const status = searchParams.get('status'); // 'completed', 'pending', or null for all
    const priority = searchParams.get('priority'); // 'high', 'medium', 'low', or null for all
    const dueDate = searchParams.get('dueDate'); // 'overdue', 'today', 'week', or null for all

    // Build where clause based on filters
    const where: any = {};

    // User filter - Authorization
    if (session.user.role === Role.ADMIN || session.user.role === Role.OFFICE_MANAGER) {
      if (requestUserIdParam) {
        const parsedUserId = parseInt(requestUserIdParam, 10);
        if (!isNaN(parsedUserId)) {
          where.userId = parsedUserId;
        }
      }
      // If admin and no userId param, fetches all users' tasks (within other filters)
    } else if (session.user.role === Role.SALES_LEAD || session.user.role === Role.SERVICE_LEAD) {
      // Logic for SALES_LEAD and SERVICE_LEAD
      const currentUserWithReports = await prisma.user.findUnique({
        where: { id: sessionUserId },
        include: { other_User: { select: { id: true } } },
      });

      if (!currentUserWithReports) {
        return NextResponse.json({ error: 'Lead user not found in database' }, { status: 404 });
      }

      const reportIds = currentUserWithReports.other_User.map(
        (report: { id: number }) => report.id
      );
      const allowedUserIds = [sessionUserId, ...reportIds];

      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (isNaN(parsedRequestUserId)) {
          return NextResponse.json({ error: 'Invalid userId parameter format' }, { status: 400 });
        }
        if (allowedUserIds.includes(parsedRequestUserId)) {
          where.userId = parsedRequestUserId;
        } else {
          return NextResponse.json(
            { error: "Forbidden: You can only view your own or your direct reports' tasks." },
            { status: 403 }
          );
        }
      } else {
        // No specific userId requested by lead, so fetch for self and all reports
        where.userId = { in: allowedUserIds };
      }
    } else {
      // Logic for other roles (e.g., SALES, SERVICE)
      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (isNaN(parsedRequestUserId) || parsedRequestUserId !== sessionUserId) {
          // If userId is provided and it's not their own or invalid
          return NextResponse.json(
            { error: 'Forbidden: You can only view your own tasks.' },
            { status: 403 }
          );
        }
        // If userId is provided and it IS their own, this is fine.
        where.userId = sessionUserId;
      } else {
        // No userId provided, defaults to their own.
        where.userId = sessionUserId;
      }
    }

    // Status filter
    if (status === 'completed') {
      where.isCompleted = true;
    } else if (status === 'pending') {
      where.isCompleted = false;
    }

    // Priority filter (now using enum)
    if (priority && ['HIGH', 'MEDIUM', 'LOW'].includes(priority.toUpperCase())) {
      where.priority = priority.toUpperCase();
    }

    // Due date filter
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate === 'overdue') {
        where.dueDate = {
          lt: today,
        };
        where.isCompleted = false;
      } else if (dueDate === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        where.dueDate = {
          gte: today,
          lt: tomorrow,
        };
      } else if (dueDate === 'week') {
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);

        where.dueDate = {
          gte: today,
          lt: weekLater,
        };
      }
    }

    // Fetch tasks with filters
    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        dueDate: 'asc',
      },
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

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = parseInt(session.user.id as string, 10);
  if (isNaN(sessionUserId)) {
    return NextResponse.json({ error: 'Invalid user ID in session' }, { status: 400 });
  }

  try {
    const data = await request.json();

    // Validate required fields - userId is no longer expected from client
    if (!data.title) {
      // userId is now from session
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || '',
        isCompleted: data.isCompleted || false,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: (data.priority || 'medium').toUpperCase(), // Convert to DB format
        category: data.category || null,
        estimatedValue: data.estimatedValue || null,
        tags: data.tags || [],
        lastContactDate: data.lastContactDate ? new Date(data.lastContactDate) : null,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
        userId: sessionUserId, // Use userId from the authenticated session
        updatedAt: new Date(), // Add required updatedAt field
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH /api/tasks/:id - Update a task
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get task ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const idString = pathParts[pathParts.length - 1]; // Renamed to avoid conflict

    if (!idString || isNaN(parseInt(idString, 10))) {
      return NextResponse.json({ error: 'Invalid task ID in path' }, { status: 400 });
    }
    const taskId = parseInt(idString, 10);

    // Fetch task to check ownership before update
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (
      task.userId !== sessionUserId &&
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        isCompleted: data.isCompleted !== undefined ? data.isCompleted : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority ? data.priority.toUpperCase() : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    if ((error as any).code === 'P2025') {
      // This specific error for update means the record to update was not found.
      // It's covered by the explicit check above, but good as a fallback.
      return NextResponse.json({ error: 'Task not found during update attempt' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/:id - Delete a task
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get task ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const idString = pathParts[pathParts.length - 1]; // Renamed to avoid conflict

    if (!idString || isNaN(parseInt(idString, 10))) {
      return NextResponse.json({ error: 'Invalid task ID in path' }, { status: 400 });
    }
    const taskId = parseInt(idString, 10);

    // Fetch task to check ownership before delete
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (
      task.userId !== sessionUserId &&
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    if ((error as any).code === 'P2025') {
      // This specific error for delete means the record to delete was not found.
      // Covered by explicit check above.
      return NextResponse.json({ error: 'Task not found during delete attempt' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
