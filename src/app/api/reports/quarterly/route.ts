import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { startOfQuarter, endOfQuarter, eachMonthOfInterval, format, subQuarters } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quarterParam = searchParams.get('quarter') || 'current';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const quarter = parseInt(searchParams.get('q') || '1');

    let startDate: Date;
    let endDate: Date;

    if (quarterParam === 'current') {
      startDate = startOfQuarter(new Date());
      endDate = endOfQuarter(new Date());
    } else {
      // Create date for specified quarter and year
      const quarterDate = new Date(year, (quarter - 1) * 3, 1);
      startDate = startOfQuarter(quarterDate);
      endDate = endOfQuarter(quarterDate);
    }

    // Get previous quarter for comparison
    const prevStartDate = startOfQuarter(subQuarters(startDate, 1));
    const prevEndDate = endOfQuarter(subQuarters(startDate, 1));

    // Fetch WeeklyActivity data for the quarter
    const weeklyActivities = await prisma.weeklyActivity.findMany({
      where: {
        weekStartDate: {
          gte: startDate,
          lte: endDate,
        },
      },
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

    // Fetch previous quarter data for comparison
    const prevWeeklyActivities = await prisma.weeklyActivity.findMany({
      where: {
        weekStartDate: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
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

    // Fetch Google Reviews (from Activity table with type GOOGLE_REVIEW)
    // Note: Using any cast until Prisma client is regenerated with new enum
    let googleReviews: any[] = [];
    try {
      googleReviews = await prisma.activity.findMany({
        where: {
          type: 'GOOGLE_REVIEW' as any,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
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
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    } catch (error) {
      console.warn('Google Reviews not available yet in schema:', error);
      googleReviews = [];
    }

    // Process quarterly data
    const quarterlyMetrics = {
      totalSales: 0,
      totalPremium: 0,
      totalContacts: 0,
      totalQuotes: 0,
      totalReferrals: 0,
      totalReferralsReceived: 0,
      totalRawNew: 0,
      totalMultiLine: 0,
      googleReviewsCount: googleReviews.length,
      avgSalesPerAgent: 0,
      conversionRate: 0,
      premiumPerSale: 0,
    };

    const departmentMetrics = {
      sales: { ...quarterlyMetrics },
      service: { ...quarterlyMetrics },
    };

    const agentPerformance: Array<{
      agentId: number;
      agentName: string;
      department: string;
      sales: number;
      premium: number;
      contacts: number;
      quotes: number;
      referrals: number;
      googleReviews: number;
      conversionRate: number;
      premiumPerSale: number;
    }> = [];

    // Process current quarter data
    const agentData = new Map<number, any>();

    weeklyActivities.forEach((activity) => {
      const data = activity.data as any;
      const userId = activity.userId;
      const userRole = activity.User.role;
      const department = userRole.includes('SALES') ? 'sales' : 'service';

      if (!agentData.has(userId)) {
        agentData.set(userId, {
          agentId: userId,
          agentName: activity.User.name,
          department,
          sales: 0,
          premium: 0,
          contacts: 0,
          quotes: 0,
          referrals: 0,
          googleReviews: 0,
          rawNew: 0,
          multiLine: 0,
        });
      }

      const agent = agentData.get(userId);

      // Aggregate weekly data
      Object.values(data || {}).forEach((dayData: any) => {
        if (dayData?.closed) {
          const daySales =
            (dayData.closed.auto || 0) +
            (dayData.closed.lifeHealth || 0) +
            (dayData.closed.fire || 0);
          agent.sales += daySales;
          quarterlyMetrics.totalSales += daySales;
          departmentMetrics[department].totalSales += daySales;

          const dayPremium =
            (dayData.closed.automotivePremium || 0) +
            (dayData.closed.lifeHealthPremium || 0) +
            (dayData.closed.propertyFirePremium || 0);
          agent.premium += dayPremium;
          quarterlyMetrics.totalPremium += dayPremium;
          departmentMetrics[department].totalPremium += dayPremium;

          // Raw New and Multi-line indicators
          const dayRawNew =
            (dayData.closed.autoRawNew || 0) +
            (dayData.closed.lifeHealthRawNew || 0) +
            (dayData.closed.fireRawNew || 0);
          agent.rawNew += dayRawNew;
          quarterlyMetrics.totalRawNew += dayRawNew;

          const dayMultiLine =
            (dayData.closed.autoMultiLine || 0) +
            (dayData.closed.lifeHealthMultiLine || 0) +
            (dayData.closed.fireMultiLine || 0);
          agent.multiLine += dayMultiLine;
          quarterlyMetrics.totalMultiLine += dayMultiLine;
        }

        if (dayData?.quotes) {
          agent.quotes += dayData.quotes;
          quarterlyMetrics.totalQuotes += dayData.quotes;
          departmentMetrics[department].totalQuotes += dayData.quotes;
        }

        if (dayData?.dials) {
          agent.contacts += dayData.dials;
          quarterlyMetrics.totalContacts += dayData.dials;
          departmentMetrics[department].totalContacts += dayData.dials;
        }

        if (dayData?.referrals) {
          agent.referrals += dayData.referrals.ask || 0;
          quarterlyMetrics.totalReferrals += dayData.referrals.ask || 0;
          departmentMetrics[department].totalReferrals += dayData.referrals.ask || 0;

          quarterlyMetrics.totalReferralsReceived += dayData.referrals.received || 0;
          departmentMetrics[department].totalReferralsReceived += dayData.referrals.received || 0;
        }
      });
    });

    // Count Google reviews per agent
    googleReviews.forEach((review) => {
      if (agentData.has(review.userId)) {
        agentData.get(review.userId).googleReviews++;
      }
    });

    // Convert agent data to performance array with calculated metrics
    agentData.forEach((agent) => {
      const conversionRate = agent.contacts > 0 ? (agent.sales / agent.contacts) * 100 : 0;
      const premiumPerSale = agent.sales > 0 ? agent.premium / agent.sales : 0;

      agentPerformance.push({
        ...agent,
        conversionRate: Math.round(conversionRate * 100) / 100,
        premiumPerSale: Math.round(premiumPerSale * 100) / 100,
      });
    });

    // Calculate overall metrics
    const uniqueAgents = agentData.size;
    quarterlyMetrics.avgSalesPerAgent =
      uniqueAgents > 0 ? quarterlyMetrics.totalSales / uniqueAgents : 0;
    quarterlyMetrics.conversionRate =
      quarterlyMetrics.totalContacts > 0
        ? (quarterlyMetrics.totalSales / quarterlyMetrics.totalContacts) * 100
        : 0;
    quarterlyMetrics.premiumPerSale =
      quarterlyMetrics.totalSales > 0
        ? quarterlyMetrics.totalPremium / quarterlyMetrics.totalSales
        : 0;

    // Calculate department metrics
    (['sales', 'service'] as const).forEach((dept) => {
      const deptAgents = Array.from(agentData.values()).filter((a: any) => a.department === dept);
      const deptMetrics = departmentMetrics[dept];

      deptMetrics.avgSalesPerAgent =
        deptAgents.length > 0 ? deptMetrics.totalSales / deptAgents.length : 0;
      deptMetrics.conversionRate =
        deptMetrics.totalContacts > 0
          ? (deptMetrics.totalSales / deptMetrics.totalContacts) * 100
          : 0;
      deptMetrics.premiumPerSale =
        deptMetrics.totalSales > 0 ? deptMetrics.totalPremium / deptMetrics.totalSales : 0;
      deptMetrics.googleReviewsCount = googleReviews.filter(
        (r: any) => agentData.get(r.userId)?.department === dept
      ).length;
    });

    // Calculate previous quarter comparison
    let prevQuarterSales = 0;
    let prevQuarterPremium = 0;
    let prevQuarterReviews = 0;

    prevWeeklyActivities.forEach((activity) => {
      const data = activity.data as any;
      Object.values(data || {}).forEach((dayData: any) => {
        if (dayData?.closed) {
          prevQuarterSales +=
            (dayData.closed.auto || 0) +
            (dayData.closed.lifeHealth || 0) +
            (dayData.closed.fire || 0);
          prevQuarterPremium +=
            (dayData.closed.automotivePremium || 0) +
            (dayData.closed.lifeHealthPremium || 0) +
            (dayData.closed.propertyFirePremium || 0);
        }
      });
    });

    // Get previous quarter Google reviews
    let prevGoogleReviews: any[] = [];
    try {
      prevGoogleReviews = await prisma.activity.findMany({
        where: {
          type: 'GOOGLE_REVIEW' as any,
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      });
    } catch (error) {
      console.warn('Previous Google Reviews not available yet:', error);
      prevGoogleReviews = [];
    }
    prevQuarterReviews = prevGoogleReviews.length;

    // Calculate growth rates
    const salesGrowthRate =
      prevQuarterSales > 0
        ? ((quarterlyMetrics.totalSales - prevQuarterSales) / prevQuarterSales) * 100
        : 0;
    const premiumGrowthRate =
      prevQuarterPremium > 0
        ? ((quarterlyMetrics.totalPremium - prevQuarterPremium) / prevQuarterPremium) * 100
        : 0;
    const reviewGrowthRate =
      prevQuarterReviews > 0
        ? ((quarterlyMetrics.googleReviewsCount - prevQuarterReviews) / prevQuarterReviews) * 100
        : 0;

    // Generate monthly breakdown
    const monthlyBreakdown = eachMonthOfInterval({ start: startDate, end: endDate }).map(
      (month) => {
        const monthStart = month;
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const monthActivities = weeklyActivities.filter((activity) => {
          const activityDate = new Date(activity.weekStartDate);
          return activityDate >= monthStart && activityDate <= monthEnd;
        });

        let monthSales = 0;
        let monthPremium = 0;
        let monthContacts = 0;

        monthActivities.forEach((activity) => {
          const data = activity.data as any;
          Object.values(data || {}).forEach((dayData: any) => {
            if (dayData?.closed) {
              monthSales +=
                (dayData.closed.auto || 0) +
                (dayData.closed.lifeHealth || 0) +
                (dayData.closed.fire || 0);
              monthPremium +=
                (dayData.closed.automotivePremium || 0) +
                (dayData.closed.lifeHealthPremium || 0) +
                (dayData.closed.propertyFirePremium || 0);
            }
            if (dayData?.dials) {
              monthContacts += dayData.dials;
            }
          });
        });

        const monthReviews = googleReviews.filter((review: any) => {
          const reviewDate = new Date(review.date);
          return reviewDate >= monthStart && reviewDate <= monthEnd;
        });

        return {
          month: format(month, 'MMMM yyyy'),
          sales: monthSales,
          premium: monthPremium,
          contacts: monthContacts,
          googleReviews: monthReviews.length,
          conversionRate: monthContacts > 0 ? (monthSales / monthContacts) * 100 : 0,
        };
      }
    );

    // Bonus calculation for Google reviews
    const bonusEligibleReviews = googleReviews
      .filter((review: any) => review.Client?.name)
      .map((review: any) => ({
        agentName: review.User.name,
        clientName: review.Client?.name || 'Unknown',
        date: format(new Date(review.date), 'yyyy-MM-dd'),
        notes: review.notes || '',
      }));

    return NextResponse.json({
      period: {
        quarter: Math.ceil((startDate.getMonth() + 1) / 3),
        year: startDate.getFullYear(),
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
      summary: quarterlyMetrics,
      departmentMetrics,
      agentPerformance: agentPerformance.sort((a, b) => b.sales - a.sales),
      monthlyBreakdown,
      googleReviews: {
        total: googleReviews.length,
        bonusEligible: bonusEligibleReviews,
        byAgent: agentPerformance
          .map((agent) => ({
            agentName: agent.agentName,
            reviewCount: agent.googleReviews,
          }))
          .filter((agent) => agent.reviewCount > 0),
      },
      growth: {
        salesGrowthRate: Math.round(salesGrowthRate * 100) / 100,
        premiumGrowthRate: Math.round(premiumGrowthRate * 100) / 100,
        reviewGrowthRate: Math.round(reviewGrowthRate * 100) / 100,
      },
      comparison: {
        currentQuarter: {
          sales: quarterlyMetrics.totalSales,
          premium: quarterlyMetrics.totalPremium,
          reviews: quarterlyMetrics.googleReviewsCount,
        },
        previousQuarter: {
          sales: prevQuarterSales,
          premium: prevQuarterPremium,
          reviews: prevQuarterReviews,
        },
      },
    });
  } catch (error) {
    console.error('Error in quarterly report:', error);
    return NextResponse.json({ error: 'Failed to generate quarterly report' }, { status: 500 });
  }
}
