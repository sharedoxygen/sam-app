import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/users/team - Get team members based on user role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    const userRole = session.user.role;
    if (
      !userRole ||
      !['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'].includes(userRole)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let teamUsers = [];

    if (userRole === 'ADMIN' || userRole === 'OFFICE_MANAGER') {
      // Admin and Office Manager can see all agents
      teamUsers = await prisma.user.findMany({
        where: {
          role: {
            in: [Role.SALES, Role.SERVICE, Role.SALES_LEAD, Role.SERVICE_LEAD],
          },
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
    } else {
      // For sales/service leads, get their team members only
      const roleFilter = userRole === 'SALES_LEAD' ? Role.SALES : Role.SERVICE;
      teamUsers = await prisma.user.findMany({
        where: {
          role: roleFilter,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    return NextResponse.json({
      users: teamUsers,
    });
  } catch (error) {
    console.error('Error fetching team users:', error);
    return NextResponse.json({ error: 'Failed to fetch team users' }, { status: 500 });
  }
}
