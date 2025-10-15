import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import AuditService from '@/lib/services/auditService';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/audit-logs - Get audit logs with filtering
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Only admins can view audit logs
        if (session.user.role !== Role.ADMIN) {
            // Log the access attempt
            await AuditService.logAuthEvent(
                'ACCESS_DENIED',
                parseInt(session.user.id),
                AuditService.extractContextFromRequest(request, parseInt(session.user.id))
            );
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const userId = searchParams.get('userId');
        const tableName = searchParams.get('tableName');
        const action = searchParams.get('action');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
        const offset = (page - 1) * limit;

        // Build filter options
        const filterOptions: any = {
            limit,
            offset,
        };

        if (userId) {
            const userIdNum = parseInt(userId);
            if (!isNaN(userIdNum)) {
                filterOptions.userId = userIdNum;
            }
        }

        if (tableName) {
            filterOptions.tableName = tableName;
        }

        if (action) {
            filterOptions.action = action;
        }

        if (startDate) {
            try {
                filterOptions.startDate = new Date(startDate);
            } catch (error) {
                return NextResponse.json({ error: 'Invalid startDate format' }, { status: 400 });
            }
        }

        if (endDate) {
            try {
                filterOptions.endDate = new Date(endDate);
            } catch (error) {
                return NextResponse.json({ error: 'Invalid endDate format' }, { status: 400 });
            }
        }

        // Get audit logs
        const { logs, total } = await AuditService.getAuditLogs(filterOptions);

        // Log the data access
        await AuditService.logDataExport(
            'audit_logs_view',
            logs.length,
            AuditService.extractContextFromRequest(request, parseInt(session.user.id))
        );

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            filters: {
                userId: userId ? parseInt(userId) : null,
                tableName,
                action,
                startDate,
                endDate,
            },
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}

// POST /api/audit-logs - Manual audit log creation (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Only admins can create manual audit logs
        if (session.user.role !== Role.ADMIN) {
            await AuditService.logAuthEvent(
                'ACCESS_DENIED',
                parseInt(session.user.id),
                AuditService.extractContextFromRequest(request, parseInt(session.user.id))
            );
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { tableName, recordId, action, changes, metadata } = body;

        // Validate required fields
        if (!tableName || recordId === undefined || !action) {
            return NextResponse.json({
                error: 'Missing required fields: tableName, recordId, action'
            }, { status: 400 });
        }

        // Validate recordId is a number
        const recordIdNum = parseInt(recordId);
        if (isNaN(recordIdNum)) {
            return NextResponse.json({ error: 'recordId must be a number' }, { status: 400 });
        }

        // Create the audit log entry
        const context = AuditService.extractContextFromRequest(request, parseInt(session.user.id));

        await AuditService.logEvent({
            tableName,
            recordId: recordIdNum,
            action,
            changes,
            userId: parseInt(session.user.id),
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                ...metadata,
                manualEntry: true,
                createdBy: session.user.name,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Audit log entry created successfully'
        });

    } catch (error) {
        console.error('Error creating audit log:', error);
        return NextResponse.json(
            { error: 'Failed to create audit log entry' },
            { status: 500 }
        );
    }
} 