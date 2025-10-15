import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering to prevent static generation errors with headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dashboard/data-range - Get the actual data range available in the system
export async function GET(request: NextRequest) {
  try {
    // No authentication required for aggregate data range metadata

    // Query the earliest and latest activity dates
    const activityRange = await prisma.activity.aggregate({
      _min: {
        date: true,
      },
      _max: {
        date: true,
      },
    });

    // Query the earliest and latest weekly activity dates
    const weeklyActivityRange = await prisma.weeklyActivity.aggregate({
      _min: {
        date: true,
      },
      _max: {
        date: true,
      },
    });

    // Determine the overall data range
    let startDate = new Date('2024-01-01'); // Safe fallback
    let endDate = new Date();

    if (activityRange._min.date) {
      startDate = activityRange._min.date;
    }

    if (weeklyActivityRange._min.date && weeklyActivityRange._min.date < startDate) {
      startDate = weeklyActivityRange._min.date;
    }

    if (activityRange._max.date && activityRange._max.date > endDate) {
      endDate = activityRange._max.date;
    }

    if (weeklyActivityRange._max.date && weeklyActivityRange._max.date > endDate) {
      endDate = weeklyActivityRange._max.date;
    }

    // Format response with proper TypeScript typing
    const response = {
      dataRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        description: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      },
      metadata: {
        activityCount: await prisma.activity.count(),
        weeklyActivityCount: await prisma.weeklyActivity.count(),
        queriedAt: new Date().toISOString(),
        updatedAt: new Date(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching data range:', error);
    return NextResponse.json({ error: 'Failed to fetch data range' }, { status: 500 });
  }
}
