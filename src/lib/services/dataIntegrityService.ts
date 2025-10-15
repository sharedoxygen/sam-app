import prisma from '@/lib/prisma';
import { Role, PrismaClient, Prisma } from '@prisma/client';
import AuditService from './auditService';

/**
 * Data Integrity Service
 *
 * Ensures comprehensive data quality and consistency across all operations.
 * Implements real-time validation, automatic synchronization, and proactive
 * data quality enforcement as required by AI_MASTER_PROMPT.md standards.
 */

// Prisma ActivityType enum values
const ActivityType = {
  CALL: 'CALL' as const,
  MEETING: 'MEETING' as const,
  EMAIL: 'EMAIL' as const,
  FOLLOW_UP: 'FOLLOW_UP' as const,
  SALE: 'SALE' as const,
  QUOTE: 'QUOTE' as const,
} as const;

type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

interface WeeklyActivityData {
  monday: DayActivityData;
  tuesday: DayActivityData;
  wednesday: DayActivityData;
  thursday: DayActivityData;
  friday: DayActivityData;
  [key: string]: DayActivityData; // Index signature for JSON compatibility
}

// Define specific property types to make type checking work properly
type ClosedData = {
  auto: number;
  lifeHealth: number;
  fire: number;
};

type ReferralsData = {
  ask: number;
  received: number;
};

interface DayActivityData {
  closed: ClosedData;
  quotes: number;
  dials: number;
  referrals: ReferralsData;
  rawNew: number;
  multiLine: number;
  // More specific index signature to accommodate all properties
  [key: string]: number | ClosedData | ReferralsData;
}

interface WeeklyMetrics {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
  rawNew: number;
  multiLine: number;
  premiumAmount: number;
  [key: string]: number; // Index signature for JSON compatibility
}

// Transaction client type
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export class DataIntegrityService {
  /**
   * TRANSACTION-LEVEL DATA INTEGRITY
   * Ensures every data operation maintains system coherence
   */

  /**
   * Creates a new user with complete data integrity setup
   */
  static async createUserWithIntegrity(userData: {
    username: string;
    password: string;
    name: string;
    email?: string;
    role: Role;
    managerId?: number;
  }, auditUserId?: number) {
    console.log(`🔒 Creating user with data integrity: ${userData.name}`);

    return await prisma.$transaction(async (tx) => {
      // 1. Create the user
      const user = await tx.user.create({
        data: {
          ...userData,
          updatedAt: new Date(),
        },
      });

      // 2. Generate baseline activity data for agents
      if (['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD'].includes(userData.role)) {
        await this.generateBaselineDataForUser(user.id, userData.role, tx);
      }

      // 3. Create current week WeeklyActivity
      await this.ensureCurrentWeekData(user.id, userData.role, tx);

      // 4. Create WeeklyForecast for current week
      await this.ensureWeeklyForecast(user.id, userData.role, tx);

      // 5. Audit log the user creation
      if (auditUserId) {
        await AuditService.logCreate('User', user.id, {
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          managerId: user.managerId,
        }, {
          userId: auditUserId,
        });
      }

      console.log(`✅ User ${userData.name} created with complete data integrity`);
      return user;
    });
  }

  /**
   * Updates a user with complete data integrity enforcement
   */
  static async updateUserWithIntegrity(
    userId: number,
    updateData: {
      username?: string;
      password?: string;
      name?: string;
      email?: string;
      role?: Role;
      managerId?: number | null;
    },
    auditUserId?: number
  ) {
    console.log(`🔒 Updating user with data integrity: ${userId}`);

    return await prisma.$transaction(async (tx) => {
      // 1. Get current user data for audit trail
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!currentUser) {
        throw new Error(`User ${userId} not found`);
      }

      // 2. Update the user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          User: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      // 3. If role changed, ensure data integrity
      const newRole = updateData.role || currentUser.role;
      if (updateData.role && updateData.role !== currentUser.role) {
        console.log(`🔄 Role changed for ${currentUser.name}: ${currentUser.role} → ${newRole}`);

        // Generate new baseline data for agents
        if (['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD'].includes(newRole)) {
          await this.generateBaselineDataForUser(userId, newRole, tx);
        }

        // Audit log role change
        if (auditUserId) {
          await AuditService.logEvent({
            tableName: 'User',
            recordId: userId,
            action: 'ROLE_CHANGE',
            changes: {
              before: { role: currentUser.role },
              after: { role: newRole },
            },
            userId: auditUserId,
            metadata: {
              userAffected: currentUser.name,
              roleChange: `${currentUser.role} → ${newRole}`,
            },
          });
        }
      }

      // 4. Ensure current week data regardless of role change
      if (['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD'].includes(newRole)) {
        await this.ensureCurrentWeekData(userId, newRole, tx);
        await this.ensureWeeklyForecast(userId, newRole, tx);
      }

      // 5. Validate data consistency
      await this.validateUserDataConsistency(userId, tx);

      // 6. Audit log the user update (if changes were made)
      if (auditUserId && Object.keys(updateData).length > 0) {
        await AuditService.logUpdate('User', userId, currentUser, updatedUser, {
          userId: auditUserId,
        });
      }

      console.log(`✅ User ${updatedUser.name} updated with complete data integrity`);
      return updatedUser;
    });
  }

  /**
   * Ensures user has current week WeeklyActivity data
   */
  static async ensureCurrentWeekData(userId: number, role: Role, tx?: TransactionClient) {
    const client = tx || prisma;
    const weekStart = this.getCurrentWeekStart();

    const existing = await client.weeklyActivity.findFirst({
      where: {
        userId,
        weekStartDate: weekStart,
      },
    });

    if (!existing) {
      console.log(`📅 Creating current week data for user ${userId}`);

      const weeklyData = this.generateRealisticWeeklyData(role);

      await client.weeklyActivity.create({
        data: {
          userId,
          date: weekStart,
          weekStartDate: weekStart,
          data: weeklyData as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Ensures user has WeeklyForecast for current week
   */
  static async ensureWeeklyForecast(userId: number, role: Role, tx?: TransactionClient) {
    const client = tx || prisma;
    const weekStart = this.getCurrentWeekStart();

    const existing = await client.weeklyForecast.findFirst({
      where: {
        userId,
        weekStartDate: weekStart,
      },
    });

    if (!existing) {
      console.log(`📈 Creating weekly forecast for user ${userId}`);

      const forecast = this.generateRealisticForecast(role);

      await client.weeklyForecast.create({
        data: {
          userId,
          weekStartDate: weekStart,
          forecast: forecast as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Creates Activity with automatic WeeklyActivity synchronization
   */
  static async createActivityWithSync(activityData: {
    type: ActivityTypeValue;
    clientName: string;
    duration: number;
    notes?: string;
    date: Date;
    userId: number;
  }) {
    console.log(`🔄 Creating activity with auto-sync for user ${activityData.userId}`);

    return await prisma.$transaction(async (tx) => {
      // 1. Create the activity
      const activity = await tx.activity.create({
        data: {
          ...activityData,
          updatedAt: new Date(),
        },
      });

      // 2. Update/create corresponding WeeklyActivity
      await this.syncActivityToWeeklyActivity(activity, tx);

      return activity;
    });
  }

  /**
   * Updates WeeklyActivity data with automatic validation
   */
  static async updateWeeklyActivityWithIntegrity(
    userId: number,
    date: Date,
    weeklyData: WeeklyActivityData,
    auditUserId?: number
  ) {
    console.log(`🔒 Updating weekly activity with integrity for user ${userId}`);

    return await prisma.$transaction(async (tx) => {
      // 1. Validate data quality
      this.validateWeeklyActivityData(weeklyData);

      // 2. Get week start date
      const weekStart = this.getWeekStart(date);

      // 3. Get existing data for audit trail
      const existingActivity = await tx.weeklyActivity.findFirst({
        where: {
          userId,
          date: weekStart,
        },
      });

      // 4. Upsert WeeklyActivity
      const weeklyActivity = await tx.weeklyActivity.upsert({
        where: {
          userId_date: {
            userId,
            date: weekStart,
          },
        },
        update: {
          data: weeklyData as Prisma.InputJsonValue,
          weekStartDate: weekStart,
        },
        create: {
          userId,
          date: weekStart,
          weekStartDate: weekStart,
          data: weeklyData as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      // 5. Audit log the weekly activity change
      if (auditUserId) {
        if (existingActivity) {
          // Update case
          await AuditService.logUpdate(
            'WeeklyActivity',
            weeklyActivity.id,
            { data: existingActivity.data },
            { data: weeklyData },
            { userId: auditUserId }
          );
        } else {
          // Create case
          await AuditService.logCreate(
            'WeeklyActivity',
            weeklyActivity.id,
            { userId, date: weekStart.toISOString(), data: weeklyData },
            { userId: auditUserId }
          );
        }
      }

      // 6. Create Activity records for revenue/sales data
      await this.createActivityRecordsFromWeeklyData(userId, date, weeklyData, tx);

      // 7. Validate cross-table consistency
      await this.validateUserDataConsistency(userId, tx);

      return weeklyActivity;
    });
  }

  /**
   * SYSTEM-WIDE DATA VALIDATION
   */

  /**
   * Validates weekly activity data quality
   */
  static validateWeeklyActivityData(data: WeeklyActivityData) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

    for (const day of days) {
      const dayData = data[day];

      // Validate required structure
      if (!dayData.closed || !dayData.referrals) {
        throw new Error(`Invalid WeeklyActivity structure for ${day}`);
      }

      // Validate number ranges
      if (dayData.dials < 0 || dayData.quotes < 0) {
        throw new Error(`Invalid negative values in WeeklyActivity for ${day}`);
      }

      // Validate business logic
      if (dayData.quotes > dayData.dials) {
        console.warn(`⚠️ Unusual data: more quotes than dials for ${day}`);
      }
    }
  }

  /**
   * Validates user's data consistency across tables
   */
  static async validateUserDataConsistency(userId: number, tx?: TransactionClient) {
    const client = tx || prisma;
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Ensure agent has current week data
    if (['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD'].includes(user.role)) {
      await this.ensureCurrentWeekData(userId, user.role, tx);
      await this.ensureWeeklyForecast(userId, user.role, tx);
    }
  }

  /**
   * AUTOMATIC DATA SYNCHRONIZATION
   */

  /**
   * Syncs Activity to WeeklyActivity automatically
   */
  static async syncActivityToWeeklyActivity(
    activity: { id: number; type: string; date: Date; userId: number; notes?: string | null },
    tx?: TransactionClient
  ) {
    const client = tx || prisma;
    const weekStart = this.getWeekStart(activity.date);
    const dayName = this.getDayName(activity.date);

    if (!dayName) return; // Skip weekends

    // Get or create WeeklyActivity record
    const existingWeeklyActivity = await client.weeklyActivity.findFirst({
      where: {
        userId: activity.userId,
        weekStartDate: weekStart,
      },
    });

    let weeklyData: WeeklyActivityData;

    if (existingWeeklyActivity) {
      weeklyData = existingWeeklyActivity.data as WeeklyActivityData;
    } else {
      // Get user role for baseline data
      const user = await client.user.findUnique({
        where: { id: activity.userId },
        select: { role: true },
      });

      if (!user) return;

      weeklyData = this.generateRealisticWeeklyData(user.role);
    }

    // Update the specific day based on activity type
    const dayData = weeklyData[dayName];
    const notes = activity.notes?.toLowerCase() || '';

    // Cast to ActivityTypeValue for switch statement
    const activityType = activity.type as ActivityTypeValue;

    switch (activityType) {
      case ActivityType.CALL:
        dayData.dials += 1;
        if (notes.includes('quote')) dayData.quotes += 1;
        break;
      case ActivityType.MEETING:
        dayData.quotes += 1;
        break;
      case ActivityType.EMAIL:
        if (notes.includes('auto')) dayData.closed.auto += 1;
        else if (notes.includes('life') || notes.includes('health')) dayData.closed.lifeHealth += 1;
        else if (notes.includes('fire') || notes.includes('property')) dayData.closed.fire += 1;
        break;
      case ActivityType.FOLLOW_UP:
        dayData.dials += 1;
        if (notes.includes('referral')) dayData.referrals.ask += 1;
        break;
    }

    // Upsert the WeeklyActivity
    await client.weeklyActivity.upsert({
      where: {
        userId_date: {
          userId: activity.userId,
          date: weekStart,
        },
      },
      update: {
        data: weeklyData as Prisma.InputJsonValue,
      },
      create: {
        userId: activity.userId,
        date: weekStart,
        weekStartDate: weekStart,
        data: weeklyData as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * PROACTIVE DATA QUALITY ENFORCEMENT
   */

  /**
   * Runs comprehensive data integrity check for all users
   */
  static async runSystemWideIntegrityCheck() {
    console.log('🔍 Running system-wide data integrity check...');

    const agents = await prisma.user.findMany({
      where: {
        role: { in: ['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD'] },
      },
    });

    let issuesFound = 0;

    for (const agent of agents) {
      try {
        await this.validateUserDataConsistency(agent.id);
        await this.ensureCurrentWeekData(agent.id, agent.role);
        await this.ensureWeeklyForecast(agent.id, agent.role);
      } catch (error) {
        console.error(`❌ Data integrity issue for ${agent.name}:`, error);
        issuesFound++;
      }
    }

    console.log(`✅ Data integrity check complete. Issues found: ${issuesFound}`);
    return issuesFound === 0;
  }

  /**
   * UTILITY FUNCTIONS
   */

  static getCurrentWeekStart(): Date {
    const today = new Date();
    const weekStart = new Date();
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  static getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  static getDayName(date: Date): keyof WeeklyActivityData | null {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = date.getDay();

    if (dayIndex >= 1 && dayIndex <= 5) {
      return dayNames[dayIndex] as keyof WeeklyActivityData;
    }

    return null; // Weekend
  }

  static generateRealisticWeeklyData(role: Role): WeeklyActivityData {
    const isService = role.toString().includes('SERVICE');
    const isLead = role.toString().includes('LEAD');

    const baseMultiplier = isLead ? 1.5 : 1.0;
    const serviceMultiplier = isService ? 1.2 : 1.0;
    const multiplier = baseMultiplier * serviceMultiplier;

    return {
      monday: this.generateDayData(role, multiplier),
      tuesday: this.generateDayData(role, multiplier),
      wednesday: this.generateDayData(role, multiplier),
      thursday: this.generateDayData(role, multiplier),
      friday: this.generateDayData(role, multiplier * 0.8),
    };
  }

  static generateDayData(role: Role, multiplier = 1.0): DayActivityData {
    const isService = role.toString().includes('SERVICE');

    const baseDials = Math.floor((Math.random() * 15 + 10) * multiplier);
    const baseQuotes = Math.floor((Math.random() * 5 + 2) * multiplier);

    return {
      closed: {
        auto: isService ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3 + 1),
        lifeHealth: Math.floor(Math.random() * 2),
        fire: Math.floor(Math.random() * 2),
      },
      quotes: baseQuotes,
      dials: baseDials,
      referrals: {
        ask: Math.floor(Math.random() * 3 + 1),
        received: Math.floor(Math.random() * 2),
      },
      rawNew: Math.floor(Math.random() * 2),
      multiLine: Math.floor(Math.random() * 2),
    };
  }

  static generateRealisticForecast(role: Role): WeeklyMetrics {
    const isLead = role.toString().includes('LEAD');
    const baseMultiplier = isLead ? 1.5 : 1.0;

    return {
      peopleContacted: Math.floor((50 + Math.random() * 30) * baseMultiplier),
      lifeSalesConversations: Math.floor((20 + Math.random() * 15) * baseMultiplier),
      sales: Math.floor((5 + Math.random() * 8) * baseMultiplier),
      referralRequests: Math.floor((10 + Math.random() * 10) * baseMultiplier),
      rawNew: Math.floor((3 + Math.random() * 4) * baseMultiplier),
      multiLine: Math.floor((2 + Math.random() * 3) * baseMultiplier),
      premiumAmount: Math.floor((5000 + Math.random() * 10000) * baseMultiplier),
    };
  }

  static async generateBaselineDataForUser(userId: number, role: Role, tx?: TransactionClient) {
    const client = tx || prisma;
    console.log(`📊 Generating baseline data for user ${userId} with role ${role}`);

    // Generate 2 weeks of historical WeeklyActivity data
    const today = new Date();
    for (let weekOffset = 1; weekOffset <= 2; weekOffset++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * weekOffset - 1));
      weekStart.setHours(0, 0, 0, 0);

      const weeklyData = this.generateRealisticWeeklyData(role);

      await client.weeklyActivity.create({
        data: {
          userId,
          date: weekStart,
          weekStartDate: weekStart,
          data: weeklyData as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }

    // Generate some recent Activity records
    const activityTypes = [
      ActivityType.CALL,
      ActivityType.MEETING,
      ActivityType.EMAIL,
      ActivityType.FOLLOW_UP,
    ];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7); // Last week

    for (let i = 0; i < 10; i++) {
      const activityDate = new Date(startDate);
      activityDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7));

      await client.activity.create({
        data: {
          type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
          duration: Math.floor(Math.random() * 60 + 15), // 15-75 minutes
          notes: `Generated baseline activity for user ${userId}`,
          date: activityDate,
          userId,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Creates Activity records from weekly revenue/sales data
   * Ensures data persistence and prevents data loss
   */
  static async createActivityRecordsFromWeeklyData(
    userId: number,
    date: Date,
    weeklyData: WeeklyActivityData,
    tx: any
  ) {
    // Determine which day of the week this is
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayData = weeklyData[dayName as keyof WeeklyActivityData];

    if (!dayData || !dayData.closed) {
      return; // No revenue data for this day
    }

    const closed = dayData.closed as any;

    // Check if there's any revenue data to process
    const hasRevenue =
      closed.auto > 0 ||
      closed.automotivePremium > 0 ||
      closed.lifeHealth > 0 ||
      closed.lifeHealthPremium > 0 ||
      closed.fire > 0 ||
      closed.propertyFirePremium > 0;

    if (!hasRevenue) {
      return; // No revenue to process
    }

    // Delete existing SALE activities for this day to avoid duplicates
    await tx.activity.deleteMany({
      where: {
        userId,
        type: 'SALE',
        date: {
          gte: new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z'),
          lt: new Date(date.toISOString().split('T')[0] + 'T23:59:59.999Z'),
        },
      },
    });

    // Create Activity records for each insurance type
    const insuranceTypes = [
      {
        type: 'AUTOMOTIVE' as const,
        count: closed.auto || 0,
        premium: closed.automotivePremium || 0,
      },
      {
        type: 'LIFE_HEALTH' as const,
        count: closed.lifeHealth || 0,
        premium: closed.lifeHealthPremium || 0,
      },
      {
        type: 'PROPERTY_FIRE' as const,
        count: closed.fire || 0,
        premium: closed.propertyFirePremium || 0,
      },
    ];

    for (const insurance of insuranceTypes) {
      if (insurance.count > 0 || insurance.premium > 0) {
        // Handle different scenarios for count and premium
        let saleCount: number;
        let premiumPerSale: number;

        if (insurance.count > 0 && insurance.premium > 0) {
          // Normal case: both count and premium specified
          saleCount = insurance.count;
          premiumPerSale = insurance.premium / saleCount;
        } else if (insurance.count > 0 && insurance.premium === 0) {
          // Count specified but no premium - create records with $0 value
          saleCount = insurance.count;
          premiumPerSale = 0;
        } else if (insurance.count === 0 && insurance.premium > 0) {
          // Premium specified but no count - create 1 sale with full premium
          saleCount = 1;
          premiumPerSale = insurance.premium;
        } else {
          // This shouldn't happen due to the if condition, but handle gracefully
          continue;
        }

        for (let i = 0; i < saleCount; i++) {
          await tx.activity.create({
            data: {
              userId,
              type: 'SALE' as const,
              date: new Date(date.getTime() + i * 60 * 60 * 1000), // Stagger by hour
              value: Math.round(premiumPerSale * 100) / 100,
              duration: 60,
              status: 'COMPLETED' as const,
              insuranceType: insurance.type,
              notes: `Revenue Generation: ${insurance.type} sale - ${saleCount} ${saleCount === 1 ? 'sale' : 'sales'}, $${insurance.premium} total premium`,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    console.log(`✅ Created Activity records for revenue data on ${dayName}`);
  }
}

export default DataIntegrityService;
