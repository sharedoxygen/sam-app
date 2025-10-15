import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import prisma from '@/lib/prisma';
import { startOfWeek } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET /api/performance-targets - Get performance targets for a user
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || session.user.id;
        const weekStartDate = searchParams.get('weekStartDate');

        const userIdInt = parseInt(userId as string, 10);
        if (isNaN(userIdInt)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        // Calculate week start date
        let weekStart: Date;
        if (weekStartDate) {
            weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 });
        } else {
            weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        }

        // Fetch performance targets from database
        const performanceTarget = await prisma.performanceTarget.findFirst({
            where: {
                userId: userIdInt,
                weekStartDate: {
                    lte: weekStart,
                },
            },
            orderBy: {
                weekStartDate: 'desc',
            },
        });

        if (performanceTarget) {
            const targets = {
                peopleContacted: performanceTarget.peopleContacted,
                lifeSalesConversations: performanceTarget.lifeSalesConversations,
                salesClosed: performanceTarget.sales,
                referralRequests: performanceTarget.referralRequests,
                premiumAmount: Number(performanceTarget.premiumAmount),
                rawNew: 2, // Default for now
                multiLine: 2, // Default for now
                googleReviews: 2, // Default for now
            };

            return NextResponse.json({ targets });
        } else {
            // Return default targets if none found
            const defaultTargets = {
                peopleContacted: 50,
                lifeSalesConversations: 15,
                salesClosed: 5,
                referralRequests: 10,
                premiumAmount: 10000,
                rawNew: 2,
                multiLine: 2,
                googleReviews: 2,
            };

            return NextResponse.json({ targets: defaultTargets });
        }
    } catch (error) {
        console.error('Error fetching performance targets:', error);
        return NextResponse.json({ error: 'Failed to fetch performance targets' }, { status: 500 });
    }
}

// POST /api/performance-targets - Save performance targets for a user
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { userId, targets, weekStartDate } = body;

        const userIdInt = parseInt(userId || session.user.id, 10);
        if (isNaN(userIdInt)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        // Check permissions - only managers can set targets for others
        const sessionUserRole = session.user.role;
        const sessionUserId = parseInt(session.user.id as string, 10);

        if (userIdInt !== sessionUserId) {
            if (!['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'].includes(sessionUserRole)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Calculate week start date
        let weekStart: Date;
        if (weekStartDate) {
            weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 });
        } else {
            weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        }

        // Upsert performance targets
        const performanceTarget = await prisma.performanceTarget.upsert({
            where: {
                userId_weekStartDate: {
                    userId: userIdInt,
                    weekStartDate: weekStart,
                },
            },
            update: {
                peopleContacted: targets.peopleContacted || 0,
                lifeSalesConversations: targets.lifeSalesConversations || 0,
                sales: targets.salesClosed || 0,
                referralRequests: targets.referralRequests || 0,
                premiumAmount: targets.premiumAmount || 0,
                setById: sessionUserId,
                updatedAt: new Date(),
            },
            create: {
                userId: userIdInt,
                weekStartDate: weekStart,
                peopleContacted: targets.peopleContacted || 0,
                lifeSalesConversations: targets.lifeSalesConversations || 0,
                sales: targets.salesClosed || 0,
                referralRequests: targets.referralRequests || 0,
                premiumAmount: targets.premiumAmount || 0,
                setById: sessionUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, performanceTarget });
    } catch (error) {
        console.error('Error saving performance targets:', error);
        return NextResponse.json({ error: 'Failed to save performance targets' }, { status: 500 });
    }
} 