import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import AuditService from '@/lib/services/auditService';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/audit-logs/stats - Get audit log statistics
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Only admins can view audit statistics
        if (session.user.role !== Role.ADMIN) {
            await AuditService.logAuthEvent(
                'ACCESS_DENIED',
                parseInt(session.user.id),
                AuditService.extractContextFromRequest(request, parseInt(session.user.id))
            );
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');

        // Validate days parameter
        if (days < 1 || days > 365) {
            return NextResponse.json({
                error: 'Days parameter must be between 1 and 365'
            }, { status: 400 });
        }

        // Get statistics
        const stats = await AuditService.getAuditStats(days);

        // Log the statistics access
        await AuditService.logDataExport(
            'audit_stats_view',
            1,
            AuditService.extractContextFromRequest(request, parseInt(session.user.id))
        );

        return NextResponse.json({
            stats,
            period: {
                days,
                startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error('Error fetching audit statistics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit statistics' },
            { status: 500 }
        );
    }
} 