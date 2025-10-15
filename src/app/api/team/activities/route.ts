import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId') || session.user.id;
    const limit = parseInt(searchParams.get('limit') || '20');
    const typeFilter = searchParams.get('type');
    const agentId = searchParams.get('agentId');
    const department = searchParams.get('department');

    // Get the manager's team members
    let teamUserIds: number[] = [];

    if (userRole === 'ADMIN' || userRole === 'OFFICE_MANAGER') {
      // Admin and Office Manager can see all users
      let roleFilters: Role[] = [Role.SALES, Role.SERVICE];

      // Apply department filter for office manager
      if (department && department !== 'all') {
        if (department === 'sales') {
          roleFilters = [Role.SALES];
        } else if (department === 'service') {
          roleFilters = [Role.SERVICE];
        }
      }

      const allUsers = await prisma.user.findMany({
        where: {
          role: {
            in: roleFilters,
          },
        },
        select: { id: true },
      });
      teamUserIds = allUsers.map((u) => u.id);
    } else {
      // For sales/service leads, get their team members
      const roleFilter = userRole === 'SALES_LEAD' ? Role.SALES : Role.SERVICE;
      const teamUsers = await prisma.user.findMany({
        where: {
          role: roleFilter,
        },
        select: { id: true },
      });
      teamUserIds = teamUsers.map((u) => u.id);
    }

    // Apply specific agent filter if provided
    if (agentId && agentId !== 'all') {
      const agentIdNum = parseInt(agentId);
      if (teamUserIds.includes(agentIdNum)) {
        teamUserIds = [agentIdNum];
      } else {
        // Agent not in user's team, return empty
        teamUserIds = [];
      }
    }

    // Build where clause
    const whereClause: any = {
      userId: {
        in: teamUserIds,
      },
    };

    if (typeFilter) {
      whereClause.type = typeFilter;
    }

    // Get recent activities from the team
    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        Client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    // Transform activities to include calculated fields
    const transformedActivities = activities.map((activity) => {
      // Determine insurance type from notes or type
      let insuranceType = 'General';
      const notes = activity.notes?.toLowerCase() || '';

      if (notes.includes('auto') || notes.includes('car')) {
        insuranceType = 'Auto Insurance';
      } else if (notes.includes('life') || notes.includes('health')) {
        insuranceType = 'Life & Health';
      } else if (notes.includes('fire') || notes.includes('property') || notes.includes('home')) {
        insuranceType = 'Property & Fire';
      }

      // Calculate value for sales
      let value = null;
      if (activity.type === 'SALE') {
        // Estimate value based on insurance type
        if (insuranceType === 'Auto Insurance') {
          value = 1200;
        } else if (insuranceType === 'Life & Health') {
          value = 2000;
        } else if (insuranceType === 'Property & Fire') {
          value = 1500;
        }
      }

      return {
        id: activity.id,
        date: activity.date,
        userId: activity.userId,
        user: activity.User,
        type: activity.type,
        clientName: activity.Client?.name || 'Unknown Client',
        duration: activity.duration,
        notes: activity.notes,
        insuranceType,
        value,
        createdAt: activity.createdAt,
        status: 'completed', // Default status
      };
    });

    return NextResponse.json({
      activities: transformedActivities,
      total: transformedActivities.length,
    });
  } catch (error) {
    console.error('Error in team activities:', error);
    return NextResponse.json({ error: 'Failed to fetch team activities' }, { status: 500 });
  }
}
