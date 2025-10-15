/**
 * Performance Target Service
 * Manages configurable performance targets for agents
 *
 * ACCESS CONTROL:
 * - AGENTS (SALES/SERVICE): READ-ONLY access to their own targets
 * - LEADS (SALES_LEAD/SERVICE_LEAD): Can set targets for direct reports
 * - MANAGERS (OFFICE_MANAGER/ADMIN): Can set targets for ANY agent
 *
 * Supports role-based access control following 6-level hierarchy
 */

import { Role } from '@prisma/client';

export interface PerformanceTargets {
  peopleContacted: number;
  lifeSalesConversations: number;
  salesClosed: number;
  referralRequests: number;
  premiumAmount: number;
  rawNew: number;
  multiLine: number;
  googleReviews: number;
}

export interface TargetConfiguration {
  userId: number;
  targets: PerformanceTargets;
  period: 'daily' | 'weekly' | 'monthly';
  effectiveFrom: Date;
  effectiveTo?: Date;
  setBy: number; // Manager who set the targets
  notes?: string;
}

// Default targets by role - these serve as fallbacks if no custom targets are set
const DEFAULT_TARGETS_BY_ROLE: Record<Role, PerformanceTargets> = {
  [Role.SALES]: {
    peopleContacted: 0, // Must be set by manager
    lifeSalesConversations: 0, // Must be set by manager
    salesClosed: 0, // Must be set by manager
    referralRequests: 0, // Must be set by manager
    premiumAmount: 0, // Must be set by manager
    rawNew: 0, // Must be set by manager
    multiLine: 0, // Must be set by manager
    googleReviews: 0, // Must be set by manager
  },
  [Role.SERVICE]: {
    peopleContacted: 0, // Must be set by manager
    lifeSalesConversations: 0, // Must be set by manager
    salesClosed: 0, // Must be set by manager
    referralRequests: 0, // Must be set by manager
    premiumAmount: 0, // Must be set by manager
    rawNew: 0, // Must be set by manager
    multiLine: 0, // Must be set by manager
    googleReviews: 0, // Must be set by manager
  },
  [Role.SALES_LEAD]: {
    peopleContacted: 0, // Must be set by manager
    lifeSalesConversations: 0, // Must be set by manager
    salesClosed: 0, // Must be set by manager
    referralRequests: 0, // Must be set by manager
    premiumAmount: 0, // Must be set by manager
    rawNew: 0, // Must be set by manager
    multiLine: 0, // Must be set by manager
    googleReviews: 0, // Must be set by manager
  },
  [Role.SERVICE_LEAD]: {
    peopleContacted: 0, // Must be set by manager
    lifeSalesConversations: 0, // Must be set by manager
    salesClosed: 0, // Must be set by manager
    referralRequests: 0, // Must be set by manager
    premiumAmount: 0, // Must be set by manager
    rawNew: 0, // Must be set by manager
    multiLine: 0, // Must be set by manager
    googleReviews: 0, // Must be set by manager
  },
  [Role.OFFICE_MANAGER]: {
    peopleContacted: 0, // Must be set by admin
    lifeSalesConversations: 0, // Must be set by admin
    salesClosed: 0, // Must be set by admin
    referralRequests: 0, // Must be set by admin
    premiumAmount: 0, // Must be set by admin
    rawNew: 0, // Must be set by admin
    multiLine: 0, // Must be set by admin
    googleReviews: 0, // Must be set by admin
  },
  [Role.ADMIN]: {
    peopleContacted: 0, // Must be set by admin
    lifeSalesConversations: 0, // Must be set by admin
    salesClosed: 0, // Must be set by admin
    referralRequests: 0, // Must be set by admin
    premiumAmount: 0, // Must be set by admin
    rawNew: 0, // Must be set by admin
    multiLine: 0, // Must be set by admin
    googleReviews: 0, // Must be set by admin
  },
};

class PerformanceTargetService {
  // In-memory storage for now - will be replaced with database calls
  private targetConfigurations: Map<string, TargetConfiguration> = new Map();

  /**
   * Get targets for a specific user (READ ACCESS)
   *
   * ACCESS RULES:
   * - Users can view their own targets
   * - Managers can view targets for users they manage
   * - AGENTS receive READ-only targets set by their managers
   */
  async getTargetsForUser(
    userId: number,
    userRole: Role,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<PerformanceTargets> {
    const key = `${userId}-${period}`;
    const config = this.targetConfigurations.get(key);

    if (config && this.isConfigurationActive(config)) {
      return config.targets;
    }

    // Return default targets based on role
    return DEFAULT_TARGETS_BY_ROLE[userRole] || DEFAULT_TARGETS_BY_ROLE[Role.SALES];
  }

  /**
   * Set targets for a user (MANAGERS ONLY - agents have read-only access)
   *
   * WHO CAN SET TARGETS:
   * - OFFICE_MANAGER: Can set targets for ANY agent
   * - ADMIN: Can set targets for ANY agent
   * - SALES_LEAD: Can set targets for direct reports
   * - SERVICE_LEAD: Can set targets for direct reports
   *
   * AGENTS (SALES/SERVICE) CANNOT modify targets - they are READ-ONLY
   */
  async setTargetsForUser(
    userId: number,
    targets: Partial<PerformanceTargets>,
    managerId: number,
    managerRole: Role,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    effectiveFrom: Date = new Date(),
    effectiveTo?: Date,
    notes?: string
  ): Promise<boolean> {
    // Check if manager has permission to set targets
    if (!this.canSetTargets(managerRole)) {
      throw new Error('Insufficient permissions to set targets');
    }

    // Authorization logic:
    // - ADMIN and OFFICE_MANAGER can set targets for ANY agent
    // - SALES_LEAD and SERVICE_LEAD can only set targets for their direct reports
    // For now, ADMIN and OFFICE_MANAGER have full access
    // TODO: Add team hierarchy check for SALES_LEAD and SERVICE_LEAD when database integration is added
    if (managerRole === Role.SALES_LEAD || managerRole === Role.SERVICE_LEAD) {
      // TODO: Implement team member validation for leads when hierarchy is in database
      // For now, allow leads to set targets for any agent until team structure is implemented
    }
    // ADMIN and OFFICE_MANAGER can set targets for anyone - no additional checks needed

    const key = `${userId}-${period}`;
    const currentTargets = await this.getTargetsForUser(userId, Role.SALES, period);

    const configuration: TargetConfiguration = {
      userId,
      targets: { ...currentTargets, ...targets },
      period,
      effectiveFrom,
      effectiveTo,
      setBy: managerId,
      notes,
    };

    this.targetConfigurations.set(key, configuration);
    return true;
  }

  /**
   * Get all target configurations for a manager's team
   */
  async getTeamTargets(managerId: number, managerRole: Role): Promise<TargetConfiguration[]> {
    if (!this.canSetTargets(managerRole)) {
      return [];
    }

    // TODO: Filter by actual team members when database integration is added
    return Array.from(this.targetConfigurations.values()).filter(
      (config) => config.setBy === managerId
    );
  }

  /**
   * Check if a manager can set targets
   */
  private canSetTargets(role: Role): boolean {
    const managerRoles: Role[] = [
      Role.ADMIN,
      Role.OFFICE_MANAGER,
      Role.SALES_LEAD,
      Role.SERVICE_LEAD,
    ];
    return managerRoles.includes(role);
  }

  /**
   * Check if a manager can set targets for a specific user
   * ADMIN and OFFICE_MANAGER can set targets for ANY agent
   * SALES_LEAD and SERVICE_LEAD can only set targets for their direct reports
   */
  canSetTargetsForUser(managerRole: Role, targetUserId: number): boolean {
    // First check if they can set targets at all
    if (!this.canSetTargets(managerRole)) {
      return false;
    }

    // ADMIN and OFFICE_MANAGER have organization-wide target setting permissions
    if (managerRole === Role.ADMIN || managerRole === Role.OFFICE_MANAGER) {
      return true;
    }

    // SALES_LEAD and SERVICE_LEAD can set targets for their direct reports
    // TODO: Implement actual team hierarchy check when database integration is added
    // For now, allowing all leads to set targets until team structure is in place
    if (managerRole === Role.SALES_LEAD || managerRole === Role.SERVICE_LEAD) {
      return true; // Will be restricted to direct reports once hierarchy is implemented
    }

    return false;
  }

  /**
   * Check if a user can view targets (read-only access)
   * All users can view their own targets
   * Managers can view targets for users they manage
   */
  canViewTargets(userRole: Role, viewingUserId: number, targetUserId: number): boolean {
    // Users can always view their own targets
    if (viewingUserId === targetUserId) {
      return true;
    }

    // Managers can view targets for users they can set targets for
    return this.canSetTargetsForUser(userRole, targetUserId);
  }

  /**
   * Check if a user can only read targets (no write access)
   * SALES and SERVICE agents can only view their targets, not modify them
   */
  isReadOnlyAccess(userRole: Role): boolean {
    return userRole === Role.SALES || userRole === Role.SERVICE;
  }

  /**
   * Check if a target configuration is currently active
   */
  private isConfigurationActive(config: TargetConfiguration): boolean {
    const now = new Date();
    const isEffective = config.effectiveFrom <= now;
    const notExpired = !config.effectiveTo || config.effectiveTo >= now;
    return isEffective && notExpired;
  }

  /**
   * Reset targets to defaults for a user
   */
  async resetToDefaults(
    userId: number,
    userRole: Role,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<PerformanceTargets> {
    const key = `${userId}-${period}`;
    this.targetConfigurations.delete(key);
    return DEFAULT_TARGETS_BY_ROLE[userRole] || DEFAULT_TARGETS_BY_ROLE[Role.SALES];
  }

  /**
   * Get default targets for a role
   */
  getDefaultTargets(role: Role): PerformanceTargets {
    return DEFAULT_TARGETS_BY_ROLE[role] || DEFAULT_TARGETS_BY_ROLE[Role.SALES];
  }
}

// Export singleton instance
export const performanceTargetService = new PerformanceTargetService();
export default performanceTargetService;
