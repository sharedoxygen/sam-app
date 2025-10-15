import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import { DataIntegrityService } from '@/lib/services/dataIntegrityService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[id]
 * Get a single user by ID
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const sessionUserId = parseInt(session.user.id as string, 10);
    if (isNaN(sessionUserId)) {
      return NextResponse.json({ error: 'Invalid user ID in session' }, { status: 401 }); // Or 500 if session is corrupted
    }

    if (
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER &&
      sessionUserId !== targetUserId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        User: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const sessionUserId = parseInt(session.user.id as string, 10);
    if (isNaN(sessionUserId)) {
      return NextResponse.json({ error: 'Invalid user ID in session' }, { status: 401 });
    }

    if (
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER &&
      sessionUserId !== targetUserId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, name, email, role: roleString, managerId } = body;

    if (
      roleString &&
      session.user.role !== Role.ADMIN &&
      session.user.role !== Role.OFFICE_MANAGER
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins or office managers can change user roles.' },
        { status: 403 }
      );
    }

    if (roleString) {
      if (!Object.values(Role).includes(roleString as Role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findFirst({
        where: { username },
      });

      if (usernameExists) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (roleString) updateData.role = roleString as Role;

    if (managerId !== undefined) {
      if (managerId === null) {
        updateData.managerId = null;
      } else {
        const managerIdInt = parseInt(managerId, 10);
        if (isNaN(managerIdInt)) {
          return NextResponse.json({ error: 'Invalid managerId format' }, { status: 400 });
        }
        updateData.managerId = managerIdInt;
      }
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // **DATA INTEGRITY ENFORCEMENT**: Use DataIntegrityService as mandated by AI_MASTER_PROMPT.md
    // This ensures proper WeeklyActivity generation and role hierarchy validation
    const updatedUser = await DataIntegrityService.updateUserWithIntegrity(
      targetUserId,
      updateData
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user (admin only)
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.OFFICE_MANAGER)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // Or 403 for admin-only
  }

  try {
    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // **DATA INTEGRITY ENFORCEMENT**: Use transaction for proper cleanup
    await prisma.$transaction(async (tx) => {
      // 1. Clean up user's WeeklyActivity and related data first
      await tx.weeklyActivity.deleteMany({
        where: { userId: targetUserId },
      });

      await tx.weeklyForecast.deleteMany({
        where: { userId: targetUserId },
      });

      await tx.activity.deleteMany({
        where: { userId: targetUserId },
      });

      await tx.task.deleteMany({
        where: { userId: targetUserId },
      });

      // 2. Delete the user
      await tx.user.delete({
        where: { id: targetUserId },
      });

      console.log(`🗑️ User ${targetUserId} and all related data deleted with integrity`);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
