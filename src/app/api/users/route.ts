import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import DataIntegrityService from '@/lib/services/dataIntegrityService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * Get all users (admin only)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.OFFICE_MANAGER)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users but don't return passwords, include manager relationships
    const users = await prisma.user.findMany({
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
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.OFFICE_MANAGER)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, password, name, email, role: roleString, managerId } = body;

    // Validate required fields
    if (!username || !password || !name || !roleString) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role: check if the provided role string is a valid Role enum value
    if (!Object.values(Role).includes(roleString as Role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` },
        { status: 400 }
      );
    }

    // Cast roleString to Role type for Prisma
    const roleEnumValue = roleString as Role;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email || undefined }, // Only check email if provided
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // **DATA INTEGRITY ENFORCEMENT**: Create user with complete data integrity
    const user = await DataIntegrityService.createUserWithIntegrity({
      username,
      password: hashedPassword,
      name,
      email,
      role: roleEnumValue,
      managerId: managerId || undefined,
    });

    // Return user without password in response
    const userResponse = await prisma.user.findUnique({
      where: { id: user.id },
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

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
