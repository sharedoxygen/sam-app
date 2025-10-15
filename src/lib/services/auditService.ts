import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Audit Service
 * 
 * Provides comprehensive audit logging for all critical system operations.
 * Automatically tracks user actions, data changes, and system events for
 * security and compliance purposes.
 */

export interface AuditLogEntry {
    tableName: string;
    recordId: number;
    action: AuditAction;
    changes?: any;
    userId: number;
    userAgent?: string;
    ipAddress?: string;
    endpoint?: string;
    metadata?: any;
}

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'ACCESS_DENIED'
    | 'PASSWORD_CHANGE'
    | 'ROLE_CHANGE'
    | 'DATA_EXPORT'
    | 'BACKUP_CREATE'
    | 'BACKUP_RESTORE'
    | 'SYSTEM_CONFIG_CHANGE';

export interface AuditContext {
    userId: number;
    userAgent?: string;
    ipAddress?: string;
    endpoint?: string;
    sessionId?: string;
}

export class AuditService {

    /**
     * Log a single audit event
     */
    static async logEvent(entry: AuditLogEntry): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    tableName: entry.tableName,
                    recordId: entry.recordId,
                    action: entry.action,
                    changes: entry.changes ? JSON.parse(JSON.stringify(entry.changes)) : null,
                    userId: entry.userId,
                    userAgent: entry.userAgent || null,
                    ipAddress: entry.ipAddress || null,
                    endpoint: entry.endpoint || null,
                    metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
                },
            });

            console.log(`🔍 Audit logged: ${entry.action} on ${entry.tableName}:${entry.recordId} by user:${entry.userId}`);
        } catch (error) {
            console.error('Failed to log audit event:', error);
            // Don't throw - audit logging should never break the main operation
        }
    }

    /**
     * Log user authentication events
     */
    static async logAuthEvent(
        action: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'PASSWORD_CHANGE',
        userId: number,
        context: Partial<AuditContext> = {}
    ): Promise<void> {
        await this.logEvent({
            tableName: 'User',
            recordId: userId,
            action,
            userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                sessionId: context.sessionId,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log data creation events
     */
    static async logCreate(
        tableName: string,
        recordId: number,
        recordData: any,
        context: AuditContext
    ): Promise<void> {
        await this.logEvent({
            tableName,
            recordId,
            action: 'CREATE',
            changes: { after: recordData },
            userId: context.userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                operation: 'create',
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log data update events
     */
    static async logUpdate(
        tableName: string,
        recordId: number,
        beforeData: any,
        afterData: any,
        context: AuditContext
    ): Promise<void> {
        // Only log if there are actual changes
        const changes = this.getChangedFields(beforeData, afterData);
        if (Object.keys(changes).length === 0) {
            return; // No changes to log
        }

        await this.logEvent({
            tableName,
            recordId,
            action: 'UPDATE',
            changes: {
                before: beforeData,
                after: afterData,
                changedFields: changes,
            },
            userId: context.userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                operation: 'update',
                fieldsChanged: Object.keys(changes),
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log data deletion events
     */
    static async logDelete(
        tableName: string,
        recordId: number,
        recordData: any,
        context: AuditContext
    ): Promise<void> {
        await this.logEvent({
            tableName,
            recordId,
            action: 'DELETE',
            changes: { before: recordData },
            userId: context.userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                operation: 'delete',
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log system configuration changes
     */
    static async logSystemChange(
        configType: string,
        changes: any,
        context: AuditContext
    ): Promise<void> {
        await this.logEvent({
            tableName: 'System',
            recordId: 0, // System-level changes don't have a specific record ID
            action: 'SYSTEM_CONFIG_CHANGE',
            changes,
            userId: context.userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                configType,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Log data export events (for compliance)
     */
    static async logDataExport(
        exportType: string,
        recordCount: number,
        context: AuditContext
    ): Promise<void> {
        await this.logEvent({
            tableName: 'System',
            recordId: 0,
            action: 'DATA_EXPORT',
            changes: null,
            userId: context.userId,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            endpoint: context.endpoint,
            metadata: {
                exportType,
                recordCount,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Get audit logs with filtering
     */
    static async getAuditLogs(options: {
        userId?: number;
        tableName?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    } = {}) {
        const where: any = {};

        if (options.userId) where.userId = options.userId;
        if (options.tableName) where.tableName = options.tableName;
        if (options.action) where.action = options.action;

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) where.createdAt.gte = options.startDate;
            if (options.endDate) where.createdAt.lte = options.endDate;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    User: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: options.limit || 100,
                skip: options.offset || 0,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    }

    /**
     * Get audit statistics
     */
    static async getAuditStats(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await prisma.auditLog.groupBy({
            by: ['action'],
            where: {
                createdAt: {
                    gte: startDate,
                },
            },
            _count: {
                action: true,
            },
        });

        const userActivity = await prisma.auditLog.groupBy({
            by: ['userId'],
            where: {
                createdAt: {
                    gte: startDate,
                },
            },
            _count: {
                userId: true,
            },
            orderBy: {
                _count: {
                    userId: 'desc',
                },
            },
            take: 10,
        });

        return {
            actionStats: stats.map(s => ({
                action: s.action,
                count: s._count.action,
            })),
            topUsers: userActivity.map(u => ({
                userId: u.userId,
                activityCount: u._count.userId,
            })),
            totalEvents: stats.reduce((sum, s) => sum + s._count.action, 0),
        };
    }

    /**
     * Extract context from NextRequest
     */
    static extractContextFromRequest(request: NextRequest, userId: number): AuditContext {
        const userAgent = request.headers.get('user-agent') || undefined;
        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ipAddress = forwarded?.split(',')[0] || realIp || request.ip || undefined;
        const endpoint = `${request.method} ${request.nextUrl.pathname}`;

        return {
            userId,
            userAgent,
            ipAddress,
            endpoint,
        };
    }

    /**
     * Helper to compare objects and find changed fields
     */
    private static getChangedFields(before: any, after: any): Record<string, { before: any; after: any }> {
        const changes: Record<string, { before: any; after: any }> = {};

        // Check all fields in the new object
        for (const key in after) {
            if (after.hasOwnProperty(key) && before.hasOwnProperty(key)) {
                if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                    changes[key] = { before: before[key], after: after[key] };
                }
            }
        }

        return changes;
    }

    /**
     * Clean up old audit logs (for data retention compliance)
     */
    static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await prisma.auditLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });

        console.log(`🧹 Cleaned up ${result.count} audit logs older than ${retentionDays} days`);
        return result.count;
    }
}

export default AuditService; 