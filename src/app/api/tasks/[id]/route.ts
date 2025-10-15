import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Fetch task to check ownership before update
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (task.userId !== sessionUserId && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Convert status to isCompleted if status is provided
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority.toUpperCase();
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

    // Handle both status and isCompleted fields
    if (data.status !== undefined) {
      updateData.isCompleted = data.status === 'completed';
    } else if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted;
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Task not found during update attempt' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Fetch task to check ownership before delete
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Authorization check
    const sessionUserId = parseInt(session.user.id as string, 10);
    if (task.userId !== sessionUserId && session.user.role !== Role.ADMIN) {
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
      return NextResponse.json({ error: 'Task not found during delete attempt' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
