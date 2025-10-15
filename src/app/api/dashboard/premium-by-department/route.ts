import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

// Force dynamic rendering to prevent static generation errors with headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN role can access this endpoint
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if no date range specified
    const endDateTime = endDate ? new Date(endDate) : new Date();
    const startDateTime = startDate
      ? new Date(startDate)
      : new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all agents with their weekly activities
    const agents = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.SALES, Role.SERVICE],
        },
      },
      include: {
        WeeklyActivity: {
          where: {
            date: {
              gte: startDateTime,
              lte: endDateTime,
            },
          },
        },
      },
    });

    // Process data by department
    const departmentData = {
      Sales: {
        department: 'Sales',
        totalPremium: 0,
        totalSales: 0,
        averagePremium: 0,
        agentCount: 0,
        agents: [] as any[],
      },
      Service: {
        department: 'Service',
        totalPremium: 0,
        totalSales: 0,
        averagePremium: 0,
        agentCount: 0,
        agents: [] as any[],
      },
    };

    // Process each agent's data
    for (const agent of agents) {
      let agentPremium = 0;
      let agentSales = 0;

      // Calculate premium from weekly activities
      for (const activity of agent.WeeklyActivity) {
        const data = activity.data as any;
        if (data && typeof data === 'object') {
          // Iterate through each day's data
          Object.values(data).forEach((dayData: any) => {
            if (dayData && dayData.closed) {
              // Add premium amounts from closed sales
              agentPremium +=
                (dayData.closed.automotivePremium || 0) +
                (dayData.closed.lifeHealthPremium || 0) +
                (dayData.closed.propertyFirePremium || 0);
              // Count sales
              agentSales +=
                (dayData.closed.automotive || 0) +
                (dayData.closed.lifeHealth || 0) +
                (dayData.closed.propertyFire || 0);
            }
          });
        }
      }

      // Determine department based on role
      const department = agent.role === Role.SALES ? 'Sales' : 'Service';
      const deptData = departmentData[department];

      // Add to department totals
      deptData.totalPremium += agentPremium;
      deptData.totalSales += agentSales;
      deptData.agentCount++;

      // Add agent to department's agent list
      if (agentPremium > 0 || agentSales > 0) {
        deptData.agents.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          premiumAmount: agentPremium,
          salesCount: agentSales,
          averagePremium: agentSales > 0 ? Math.round(agentPremium / agentSales) : 0,
        });
      }
    }

    // Calculate department averages and sort agents
    Object.values(departmentData).forEach((dept) => {
      dept.averagePremium =
        dept.totalSales > 0 ? Math.round(dept.totalPremium / dept.totalSales) : 0;
      // Sort agents by premium amount (descending)
      dept.agents.sort((a, b) => b.premiumAmount - a.premiumAmount);
    });

    return NextResponse.json({
      departments: Object.values(departmentData),
      dateRange: {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching department premiums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
