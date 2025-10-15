import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { ActivityType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Type definitions for quotes
type InsuranceType = 'AUTO' | 'LIFE_HEALTH' | 'PROPERTY_FIRE';
type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

interface QuoteRequest {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  insuranceType: InsuranceType;
  premium: number;
  description: string;
  validUntil: string;
  notes?: string;
}

interface QuoteResponse {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  insuranceType: InsuranceType;
  premium: number;
  description: string;
  quoteDate: string;
  validUntil: string;
  status: QuoteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// GET /api/quotes - Get quotes with filtering and search
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserIdInt = parseInt(sessionUserId);

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    const insuranceType = searchParams.get('insuranceType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const requestUserIdParam = searchParams.get('userId');

    const where: any = {};

    // Authorization logic - similar to activities
    if (session.user.role === 'ADMIN' || session.user.role === 'OFFICE_MANAGER') {
      if (requestUserIdParam) {
        const parsedRequestUserId = parseInt(requestUserIdParam, 10);
        if (!isNaN(parsedRequestUserId)) {
          where.userId = parsedRequestUserId;
        }
      }
    } else if (session.user.role === 'SALES_LEAD' || session.user.role === 'SERVICE_LEAD') {
      // Lead can see their own quotes and their team's quotes
      const leadWithReports = await prisma.user.findUnique({
        where: { id: sessionUserIdInt },
        include: { other_User: { select: { id: true } } },
      });

      if (leadWithReports) {
        const allowedIds = [
          sessionUserIdInt,
          ...leadWithReports.other_User.map((report) => report.id),
        ];

        if (requestUserIdParam) {
          const parsedRequestUserId = parseInt(requestUserIdParam, 10);
          if (isNaN(parsedRequestUserId) || !allowedIds.includes(parsedRequestUserId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          where.userId = parsedRequestUserId;
        } else {
          where.userId = { in: allowedIds };
        }
      } else {
        where.userId = sessionUserIdInt;
      }
    } else {
      // Regular users can only see their own quotes
      where.userId = sessionUserIdInt;
    }

    // Add filters
    if (insuranceType) {
      where.insuranceType = insuranceType;
    }

    if (status) {
      where.status = status;
    }

    // Search functionality
    if (search) {
      where.OR = [{ notes: { contains: search, mode: 'insensitive' } }];
    }

    // Since quotes are stored as Activities with type QUOTE, we'll query the Activity table
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: {
          ...where,
          type: ActivityType.QUOTE,
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          Client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({
        where: {
          ...where,
          type: ActivityType.QUOTE,
        },
      }),
    ]);

    // Transform activities to quote format
    const quotes: QuoteResponse[] = activities.map((activity) => ({
      id: activity.id.toString(),
      clientName: activity.Client?.name || 'Unknown Client',
      clientEmail: activity.Client?.email || undefined,
      clientPhone: activity.Client?.phone || undefined,
      insuranceType: (activity.insuranceType as InsuranceType) || 'AUTO',
      premium: Number(activity.value || 0),
      description: activity.notes || 'No description provided',
      quoteDate: activity.date.toISOString().split('T')[0],
      validUntil: new Date(activity.date.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days from quote date
      status: (activity.status as QuoteStatus) || 'PENDING',
      notes: activity.notes || undefined,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      createdBy: activity.User.name,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      quotes,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

// POST /api/quotes - Create a new quote
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = String(session.user.id);
  const sessionUserIdInt = parseInt(sessionUserId);

  try {
    const body: QuoteRequest = await request.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      insuranceType,
      premium,
      description,
      validUntil,
      notes,
    } = body;

    // Validate required fields
    if (!clientName || !insuranceType || !premium || !description || !validUntil) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: clientName, insuranceType, premium, description, validUntil',
        },
        { status: 400 }
      );
    }

    // Validate insurance type
    if (!['AUTO', 'LIFE_HEALTH', 'PROPERTY_FIRE'].includes(insuranceType)) {
      return NextResponse.json(
        {
          error: 'Invalid insurance type',
        },
        { status: 400 }
      );
    }

    // Validate premium
    if (isNaN(premium) || premium < 0) {
      return NextResponse.json(
        {
          error: 'Invalid premium amount',
        },
        { status: 400 }
      );
    }

    // Validate valid until date - fix timezone issue
    const validUntilDate = new Date(validUntil + 'T00:00:00.000Z');
    const nowUTC = new Date();
    const todayUTC = new Date(
      Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
    );

    if (isNaN(validUntilDate.getTime()) || validUntilDate <= todayUTC) {
      return NextResponse.json(
        {
          error: 'Valid until date must be in the future',
        },
        { status: 400 }
      );
    }

    // Create or find client
    let client = null;
    if (clientEmail) {
      client = await prisma.client.upsert({
        where: { email: clientEmail },
        update: {
          name: clientName,
          phone: clientPhone,
          updatedAt: new Date(),
        },
        create: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create client without email (phone or name only)
      client = await prisma.client.create({
        data: {
          name: clientName,
          phone: clientPhone,
          updatedAt: new Date(),
        },
      });
    }

    // Create the quote as an Activity
    const activity = await prisma.activity.create({
      data: {
        type: ActivityType.QUOTE,
        userId: sessionUserIdInt,
        clientId: client.id,
        insuranceType: insuranceType as any, // Cast to Prisma enum
        value: premium,
        notes: description + (notes ? `\n\nNotes: ${notes}` : ''),
        status: 'PENDING',
        date: new Date(),
        duration: 30, // Default duration for quotes
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Transform to quote response format
    const quoteResponse: QuoteResponse = {
      id: activity.id.toString(),
      clientName: client.name,
      clientEmail: client.email || undefined,
      clientPhone: client.phone || undefined,
      insuranceType: insuranceType,
      premium: premium,
      description: description,
      quoteDate: activity.date.toISOString().split('T')[0],
      validUntil: validUntil,
      status: 'PENDING',
      notes: notes,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
      createdBy: session.user.name || 'User',
    };

    return NextResponse.json(quoteResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}

// PUT /api/quotes/[id] - Update quote status (for future use)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields: id, status' }, { status: 400 });
    }

    if (!['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const sessionUserIdInt = parseInt(String(session.user.id));

    // Check if user can update this quote
    const activity = await prisma.activity.findFirst({
      where: {
        id: parseInt(id),
        type: ActivityType.QUOTE,
      },
      include: {
        User: true,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Authorization check
    const canUpdate =
      activity.userId === sessionUserIdInt ||
      session.user.role === 'ADMIN' ||
      session.user.role === 'OFFICE_MANAGER' ||
      session.user.role === 'SALES_LEAD' ||
      session.user.role === 'SERVICE_LEAD';

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the activity
    const updatedActivity = await prisma.activity.update({
      where: { id: parseInt(id) },
      data: {
        status: status,
        notes: notes ? `${activity.notes}\n\nStatus Update: ${notes}` : activity.notes,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Transform to quote response format
    const quoteResponse: QuoteResponse = {
      id: updatedActivity.id.toString(),
      clientName: updatedActivity.Client?.name || 'Unknown Client',
      clientEmail: updatedActivity.Client?.email || undefined,
      clientPhone: updatedActivity.Client?.phone || undefined,
      insuranceType: (updatedActivity.insuranceType as InsuranceType) || 'AUTO',
      premium: Number(updatedActivity.value || 0),
      description:
        updatedActivity.notes?.split('\n\nStatus Update:')[0] || 'No description provided',
      quoteDate: updatedActivity.date.toISOString().split('T')[0],
      validUntil: new Date(updatedActivity.date.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: status,
      notes: notes,
      createdAt: updatedActivity.createdAt.toISOString(),
      updatedAt: updatedActivity.updatedAt.toISOString(),
      createdBy: updatedActivity.User.name,
    };

    return NextResponse.json(quoteResponse);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
