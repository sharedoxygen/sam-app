import { config } from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  startOfWeek,
  format as formatDateFns,
  parseISO,
} from 'date-fns';
import DataIntegrityService from '../src/lib/services/dataIntegrityService';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_NAME = process.env.DATABASE_NAME || 'asam_d';

console.log(`🌱 Enhanced Seed Script (Data Integrity Enforced)`);
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🗄️  Database: ${DATABASE_NAME}`);

// Type definitions for daily activity data
type DayActivities = {
  closed: { auto: number; lifeHealth: number; fire: number };
  quotes: number;
  dials: number;
  referrals: { ask: number; received: number };
};

type WeeklyActivityData = {
  monday: DayActivities;
  tuesday: DayActivities;
  wednesday: DayActivities;
  thursday: DayActivities;
  friday: DayActivities;
};

// Insurance products for a typical agency
const INSURANCE_PRODUCTS = [
  'Auto Insurance',
  'Home Insurance',
  'Life Insurance',
  'Health Insurance',
  'Business Insurance',
  'Umbrella Policy',
  'Renters Insurance',
  'Disability Insurance',
];

// Realistic client names for test data
const TEST_CLIENTS = [
  'Robert Johnson',
  'Patricia Williams',
  'Michael Brown',
  'Jennifer Davis',
  'David Miller',
  'Elizabeth Wilson',
  'Christopher Moore',
  'Barbara Taylor',
  'Matthew Anderson',
  'Susan Thomas',
  'Joseph Jackson',
  'Margaret White',
  'Charles Harris',
  'Dorothy Martin',
  'Thomas Thompson',
  'Lisa Garcia',
  'Donald Martinez',
  'Nancy Robinson',
  'Mark Clark',
  'Betty Rodriguez',
  'Anderson Construction LLC',
  'Premier Health Services',
  'TechVision Solutions',
  'Green Valley Farms',
  'Riverside Manufacturing',
  'Summit Financial Group',
  'Oakwood Properties',
  'Metro Transportation Inc',
  'Pinnacle Consulting',
  'Heritage Retail Group',
  'Coastal Logistics',
  'Mountain View Development',
];

// Activity types and their typical durations
const ACTIVITY_TYPES = {
  CALL: { minDuration: 5, maxDuration: 30 },
  MEETING: { minDuration: 30, maxDuration: 90 },
  EMAIL: { minDuration: 5, maxDuration: 20 },
  FOLLOW_UP: { minDuration: 10, maxDuration: 45 },
};

// Base users for all environments
async function createBaseUsers() {
  console.log('🏗️  Creating organizational hierarchy...');

  const users: Record<string, any> = {};
  const defaultPassword = 'agent123'; // New default password
  const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10); // Hash it once

  // Admin User (System Administrator - Immutable)
  const adminData = {
    username: 'admin', // Immutable system admin username
    password: await bcrypt.hash('adminpass', 10), // Admin password
    name: 'System Administrator',
    email: 'admin@asam.local',
    role: Role.ADMIN,
    updatedAt: new Date(),
  };

  users.admin = await prisma.user.upsert({
    where: { username: adminData.username },
    update: { 
      role: adminData.role,
      password: adminData.password,
      email: adminData.email,
      name: adminData.name,
    }, // Update role, password, email, and name - admin is immutable
    create: adminData,
  });
  console.log(`✅ Created/Updated: ${users.admin.username} (${users.admin.role}) [IMMUTABLE]`);

  // Only create additional users for non-production environments
  if (DATABASE_NAME !== 'asam') {
    // Office Manager (Jay Cee - Reports to Admin)
    const managerData = {
      username: 'jay',
      password: hashedDefaultPassword, // Standard password
      name: 'Jay Cee',
      email: 'jay.cee@asam.local',
      role: Role.OFFICE_MANAGER,
      managerId: users.admin.id,
      updatedAt: new Date(),
    };

    users.manager = await prisma.user.upsert({
      where: { username: managerData.username },
      update: { 
        managerId: managerData.managerId,
        password: managerData.password,
        email: managerData.email,
        role: managerData.role,
      },
      create: managerData,
    });
    console.log(`✅ Created/Updated: ${users.manager.username} (${users.manager.role})`);

    // Sales Lead
    const salesLeadData = {
      username: 'brittany',
      password: hashedDefaultPassword, // Use hashed default password
      name: 'Brittany Penny',
      email: 'brittany.penny@asam.local',
      role: Role.SALES_LEAD,
      managerId: users.manager.id,
      updatedAt: new Date(),
    };

    users.salesLead = await prisma.user.upsert({
      where: { username: salesLeadData.username },
      update: { 
        managerId: salesLeadData.managerId,
        password: salesLeadData.password,
        email: salesLeadData.email,
        role: salesLeadData.role,
      },
      create: salesLeadData,
    });
    console.log(`✅ Created/Updated: ${users.salesLead.username} (${users.salesLead.role})`);

    // Service Lead
    const serviceLeadData = {
      username: 'nickcol',
      password: hashedDefaultPassword, // Use hashed default password
      name: 'Nickcol Jones',
      email: 'nickcol.jones@asam.local',
      role: Role.SERVICE_LEAD,
      managerId: users.manager.id,
      updatedAt: new Date(),
    };

    users.serviceLead = await prisma.user.upsert({
      where: { username: serviceLeadData.username },
      update: { 
        managerId: serviceLeadData.managerId,
        password: serviceLeadData.password,
        email: serviceLeadData.email,
        role: serviceLeadData.role,
      },
      create: serviceLeadData,
    });
    console.log(`✅ Created/Updated: ${users.serviceLead.username} (${users.serviceLead.role})`);

    // Sales Agents (2)
    const salesAgents = [
      {
        username: 'alianna',
        name: 'Alianna Happitit',
        email: 'alianna.happitit@asam.local',
      },
      {
        username: 'sarah',
        name: 'Sarah Williams',
        email: 'sarah.williams@asam.local',
      },
    ];

    users.salesAgents = [];
    for (const agent of salesAgents) {
      const agentData = {
        username: agent.username,
        password: hashedDefaultPassword, // Use hashed default password
        name: agent.name,
        email: agent.email,
        role: Role.SALES,
        managerId: users.salesLead.id,
        updatedAt: new Date(),
      };

      const user = await prisma.user.upsert({
        where: { username: agentData.username },
        update: { 
          managerId: agentData.managerId,
          password: agentData.password,
          email: agentData.email,
          role: agentData.role,
        },
        create: agentData,
      });
      users.salesAgents.push(user);
      console.log(`✅ Created/Updated: ${user.username} (${user.role})`);
    }

    // Service Agents (3)
    const serviceAgents = [
      {
        username: 'austin',
        name: 'Austin Poppins',
        email: 'austin.poppins@asam.local',
      },
      {
        username: 'emily',
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@asam.local',
      },
      {
        username: 'james',
        name: 'James Taylor',
        email: 'james.taylor@asam.local',
      },
    ];

    users.serviceAgents = [];
    for (const agent of serviceAgents) {
      const agentData = {
        username: agent.username,
        password: hashedDefaultPassword, // Use hashed default password
        name: agent.name,
        email: agent.email,
        role: Role.SERVICE,
        managerId: users.serviceLead.id,
        updatedAt: new Date(),
      };

      const user = await prisma.user.upsert({
        where: { username: agentData.username },
        update: { 
          managerId: agentData.managerId,
          password: agentData.password,
          email: agentData.email,
          role: agentData.role,
        },
        create: agentData,
      });
      users.serviceAgents.push(user);
      console.log(`✅ Created/Updated: ${user.username} (${user.role})`);
    }
  }

  return users;
}

// Generate realistic activity data for a user
async function generateActivitiesForUser(
  userId: number,
  startDate: Date,
  endDate: Date,
  role: Role
) {
  console.log(`  📊 Generating activities for user ${userId}...`);

  // Get all clients to reference
  const allClients = await prisma.client.findMany();
  if (allClients.length === 0) {
    console.log(`    ⚠️ No clients found, skipping activity generation for user ${userId}`);
    return;
  }

  const activities = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const activitiesPerDay =
      role === Role.SALES || role === Role.SALES_LEAD
        ? Math.floor(Math.random() * 15) + 15 // 15-29 activities per day for sales
        : Math.floor(Math.random() * 12) + 10; // 10-21 activities per day for service

    for (let i = 0; i < activitiesPerDay; i++) {
      const activityType = Object.keys(ACTIVITY_TYPES)[
        Math.floor(Math.random() * Object.keys(ACTIVITY_TYPES).length)
      ] as keyof typeof ACTIVITY_TYPES;
      const typeConfig = ACTIVITY_TYPES[activityType];
      const duration =
        Math.floor(Math.random() * (typeConfig.maxDuration - typeConfig.minDuration + 1)) +
        typeConfig.minDuration;

      const hour = Math.floor(Math.random() * 10) + 8;
      const minute = Math.floor(Math.random() * 60);
      const activityDate = setMinutes(setHours(currentDate, hour), minute);

      const client = allClients[Math.floor(Math.random() * allClients.length)];
      const product = INSURANCE_PRODUCTS[Math.floor(Math.random() * INSURANCE_PRODUCTS.length)];

      // Enhanced notes generation for better metric triggering
      let notesDetails = '';
      const willQuote = Math.random() < 0.7; // 70% chance
      const willRefer = Math.random() < 0.4; // 40% chance
      const willCloseSale = Math.random() < 0.3; // 30% chance for activities that might lead to a sale

      switch (activityType) {
        case 'CALL':
          notesDetails = `Discussed coverage options for ${product}. `;
          if (willQuote) notesDetails += 'Provided a premium quote. ';
          if (willRefer) notesDetails += 'Asked for a referral. ';
          if (product.includes('Life') && willCloseSale)
            notesDetails += 'Strong interest in Life Insurance policy. ';
          else if (product.includes('Auto') && willCloseSale)
            notesDetails += 'Considering Auto Insurance package. ';
          else if (
            (product.includes('Home') || product.includes('Renters') || product.includes('Fire')) &&
            willCloseSale
          )
            notesDetails += 'Reviewing Home/Fire Insurance options. ';
          notesDetails += 'Scheduled follow-up.';
          break;
        case 'MEETING':
          notesDetails = `In-person consultation for ${product}. Reviewed needs assessment. `;
          if (product.includes('Life') || product.includes('Health'))
            notesDetails += `Focused on ${product} options. `;
          else if (product.includes('Auto')) notesDetails += `Focused on ${product}. `;
          else if (product.includes('Home') || product.includes('Renters'))
            notesDetails += `Focused on ${product}. `;
          else notesDetails += `Discussed various products including ${product}. `; // Ensure product is mentioned

          if (willQuote) notesDetails += 'Presented a detailed quote. ';
          if (willRefer) notesDetails += 'Requested referrals. ';
          break;
        case 'EMAIL':
          notesDetails = `Sent detailed proposal for ${product}. `;
          if (willQuote) notesDetails += 'Included quote comparison and pricing. ';
          else notesDetails += 'Outlined benefits. ';
          break;
        case 'FOLLOW_UP':
          notesDetails = `Following up on ${product} inquiry. `;
          if (willRefer) notesDetails += 'Good opportunity for referral. ';
          if (willQuote && Math.random() < 0.5) notesDetails += 'Re-sent quote. ';
          notesDetails += 'Addressing concerns and next steps.';
          break;
      }

      const activity = {
        type: activityType,
        clientId: client.id,
        duration,
        notes: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} with ${client.name} - ${notesDetails}`,
        date: activityDate,
        userId,
        updatedAt: new Date(),
      };

      activities.push(activity);
    }

    currentDate = addDays(currentDate, 1);
  }

  // Bulk create activities
  if (activities.length > 0) {
    await prisma.activity.createMany({
      data: activities,
      skipDuplicates: true,
    });
    console.log(`    ✅ Created ${activities.length} activities for user ${userId}`);
  }
}

// Generate tasks for users
async function generateTasksForUser(userId: number, role: Role) {
  console.log(`  📋 Generating tasks for user ${userId}...`);

  // Get all clients to reference
  const allClients = await prisma.client.findMany();
  if (allClients.length === 0) {
    console.log(`    ⚠️ No clients found, skipping task generation for user ${userId}`);
    return;
  }

  const tasks = [];
  const numTasks = role === Role.SALES || role === Role.SALES_LEAD ? 8 : 5;

  for (let i = 0; i < numTasks; i++) {
    const client = allClients[Math.floor(Math.random() * allClients.length)];
    const product = INSURANCE_PRODUCTS[Math.floor(Math.random() * INSURANCE_PRODUCTS.length)];
    const priority = ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)] as
      | 'HIGH'
      | 'MEDIUM'
      | 'LOW';
    const category =
      role === Role.SALES || role === Role.SALES_LEAD
        ? ['sales', 'follow-up', 'meeting', 'call'][Math.floor(Math.random() * 4)]
        : ['service', 'follow-up', 'email', 'call'][Math.floor(Math.random() * 4)];

    const task = {
      title: `${category === 'sales' ? 'Close deal' : category.charAt(0).toUpperCase() + category.slice(1)} - ${client.name}`,
      description: `${product} - ${category === 'sales'
        ? 'Finalize quote, complete application, and process payment'
        : category === 'follow-up'
          ? 'Check on recent inquiry status and address any pending questions'
          : category === 'meeting'
            ? 'Schedule comprehensive policy review meeting'
            : category === 'call'
              ? 'Contact regarding policy renewal and coverage updates'
              : 'Process service request and ensure customer satisfaction'
        }`,
      isCompleted: Math.random() > 0.7,
      dueDate: addDays(new Date(), Math.floor(Math.random() * 14) - 7),
      priority,
      category,
      clientId: client.id,
      estimatedValue:
        category === 'sales' ? (Math.floor(Math.random() * 5000) + 1000).toString() : null,
      tags: [product.toLowerCase().replace(/\s+/g, '-'), category],
      lastContactDate: addDays(new Date(), -Math.floor(Math.random() * 30)),
      nextFollowUpDate: addDays(new Date(), Math.floor(Math.random() * 7) + 1),
      userId,
      updatedAt: new Date(),
    };

    tasks.push(task);
  }

  if (tasks.length > 0) {
    await prisma.task.createMany({
      data: tasks,
      skipDuplicates: true,
    });
    console.log(`    ✅ Created ${tasks.length} tasks`);
  }
}

// Generate sales metrics
async function generateSalesMetrics() {
  console.log('📈 Generating enhanced sales metrics for extended period...');

  const startDate = new Date('2024-09-01');
  const endDate = new Date('2025-06-06');

  // Get all users to generate metrics for
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: [Role.SALES, Role.SALES_LEAD, Role.SERVICE, Role.SERVICE_LEAD],
      },
    },
  });

  const metrics = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const weekNumber = Math.ceil(currentDate.getDate() / 7);

    // Generate metrics for each user
    for (const user of users) {
      const metric = {
        weekNumber,
        year: 2025,
        calls: Math.floor(Math.random() * 100) + 150,
        meetings: Math.floor(Math.random() * 20) + 30,
        followUps: Math.floor(Math.random() * 50) + 80,
        emails: Math.floor(Math.random() * 80) + 120,
        sales: Math.floor(Math.random() * 15) + 10,
        revenue: Math.random() * 50000 + 75000,
        date: new Date(currentDate),
        userId: user.id,
        updatedAt: new Date(),
      };

      metrics.push(metric);
    }

    currentDate = addDays(currentDate, 7);
  }

  if (metrics.length > 0) {
    await prisma.salesMetric.createMany({
      data: metrics,
      skipDuplicates: true,
    });
    console.log(`✅ Created ${metrics.length} sales metrics`);
  }
}

// Clear all data (for reset functionality)
async function clearAllData() {
  console.log('🧹 Clearing existing data...');

  // Delete in order to respect foreign key constraints
  await prisma.performanceTarget.deleteMany({});
  await prisma.weeklyForecast.deleteMany({});
  await prisma.weeklyActivity.deleteMany({});
  await prisma.salesMetric.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.activity.deleteMany({});
  // Temporarily keeping clients and users during schema migration
  // await prisma.client.deleteMany({});
  // await prisma.user.deleteMany({});

  console.log('✅ All data cleared');
}

// Get day name from date
function getDayNameForWeekly(
  date: Date
): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null {
  const day = date.getDay();
  switch (day) {
    case 1:
      return 'monday';
    case 2:
      return 'tuesday';
    case 3:
      return 'wednesday';
    case 4:
      return 'thursday';
    case 5:
      return 'friday';
    default:
      return null;
  }
}

// Logic from generate-weekly-activities.ts, adapted to be a function
async function generateWeeklyActivitiesFromSeed() {
  console.log('\n🔄 Generating WeeklyActivity records from Activity data...');

  try {
    const users = await prisma.user.findMany({
      include: {
        Activity: { orderBy: { date: 'asc' } },
      },
    });

    for (const user of users) {
      if (user.Activity.length === 0) continue;
      console.log(
        `  📊 Processing activities for ${user.name} (${user.username}) for weekly summary...`
      );

      const activitiesByWeek = new Map<string, any[]>(); // Use any[] for activities type
      for (const activity of user.Activity) {
        const weekStart = startOfWeek(activity.date, { weekStartsOn: 1 });
        const weekKey = formatDateFns(weekStart, 'yyyy-MM-dd');
        if (!activitiesByWeek.has(weekKey)) {
          activitiesByWeek.set(weekKey, []);
        }
        activitiesByWeek.get(weekKey)!.push(activity);
      }

      for (const [weekKey, activities] of Array.from(activitiesByWeek.entries())) {
        const [year, month, day] = weekKey.split('-').map(Number);
        const weekStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        // DYNAMIC DEBUG LOGGING START
        if (user.username === 'sales_lead' && weekKey === '2025-05-26') {
          console.log(
            `\nDEBUG: USER ${user.username} (ID: ${user.id}), WEEK 2025-05-26 in generateWeeklyActivitiesFromSeed`
          );
          console.log(`  weekKey: ${weekKey}`);
          console.log(`  constructed weekStartDate: ${weekStartDate.toISOString()}`);
          console.log(`  Number of activities for this week: ${activities.length}`);
        }
        // DYNAMIC DEBUG LOGGING END

        const weeklyData: WeeklyActivityData = {
          monday: {
            closed: { auto: 0, lifeHealth: 0, fire: 0 },
            quotes: 0,
            dials: 0,
            referrals: { ask: 0, received: 0 },
          },
          tuesday: {
            closed: { auto: 0, lifeHealth: 0, fire: 0 },
            quotes: 0,
            dials: 0,
            referrals: { ask: 0, received: 0 },
          },
          wednesday: {
            closed: { auto: 0, lifeHealth: 0, fire: 0 },
            quotes: 0,
            dials: 0,
            referrals: { ask: 0, received: 0 },
          },
          thursday: {
            closed: { auto: 0, lifeHealth: 0, fire: 0 },
            quotes: 0,
            dials: 0,
            referrals: { ask: 0, received: 0 },
          },
          friday: {
            closed: { auto: 0, lifeHealth: 0, fire: 0 },
            quotes: 0,
            dials: 0,
            referrals: { ask: 0, received: 0 },
          },
        };

        for (const activity of activities) {
          const dayName = getDayNameForWeekly(activity.date);
          if (!dayName) continue;
          const dayData = weeklyData[dayName];
          const notesLower = activity.notes?.toLowerCase() || '';

          switch (activity.type) {
            case 'CALL':
            case 'call': // Handle both old and new formats
              dayData.dials += Math.floor(Math.random() * 5) + 3;
              if (notesLower.includes('quote')) dayData.quotes += 1;
              if (notesLower.includes('referral')) {
                dayData.referrals.ask += 1;
                if (Math.random() > 0.5) dayData.referrals.received += 1;
              }
              break;
            case 'MEETING':
            case 'meeting': // Handle both old and new formats
              dayData.dials += 1;
              if (
                notesLower.includes('life insurance') ||
                notesLower.includes('health insurance')
              ) {
                dayData.closed.lifeHealth += Math.random() > 0.7 ? 1 : 0;
              } else if (notesLower.includes('auto insurance')) {
                dayData.closed.auto += Math.random() > 0.7 ? 1 : 0;
              } else if (notesLower.includes('home insurance') || notesLower.includes('fire')) {
                dayData.closed.fire += Math.random() > 0.7 ? 1 : 0;
              }
              dayData.quotes += Math.random() > 0.5 ? 1 : 0;
              break;
            case 'EMAIL':
            case 'email': // Handle both old and new formats
              if (notesLower.includes('proposal') || notesLower.includes('quote'))
                dayData.quotes += 1;
              break;
            case 'FOLLOW_UP':
            case 'follow-up': // Handle both old and new formats
              dayData.dials += 1;
              if (notesLower.includes('referral')) dayData.referrals.ask += 1;
              break;
          }
        }

        await prisma.weeklyActivity.upsert({
          where: { userId_date: { userId: user.id, date: weekStartDate } },
          update: { data: weeklyData, weekStartDate: weekStartDate },
          create: {
            userId: user.id,
            date: weekStartDate,
            weekStartDate: weekStartDate,
            data: weeklyData,
            updatedAt: new Date(),
          },
        });

        // DYNAMIC DEBUG LOGGING START
        if (user.username === 'sales_lead' && weekKey === '2025-05-26') {
          console.log(
            `  DB upsert attempted for USER ${user.username} (ID: ${user.id}), weekStartDate: ${weekStartDate.toISOString()}`
          );
          const verifyRecord = await prisma.weeklyActivity.findUnique({
            where: { userId_date: { userId: user.id, date: weekStartDate } },
          });
          console.log(`  Verification after upsert: Record ${verifyRecord ? 'EXISTS' : 'MISSING'}`);
          if (verifyRecord)
            console.log(
              `  Verified Record weekStartDate: ${verifyRecord.weekStartDate.toISOString()}`
            );
          console.log(`----------------------------------------------------`);
        }
        // DYNAMIC DEBUG LOGGING END
        // console.log(`    ✅ Generated weekly data for ${user.name} - Week of ${formatDateFns(weekStartDate, 'MMM d, yyyy')}`);
      }
    }
    const totalWeeklyActivities = await prisma.weeklyActivity.count();
    console.log(`\n✅ Generated/Updated ${totalWeeklyActivities} WeeklyActivity records!`);
  } catch (error) {
    console.error('❌ Error generating weekly activities within seed script:', error);
  }
  // No prisma.$disconnect() here, as it will be handled by the main seed script's finally block
}

// Helper to create realistic email from name
function createEmailFromName(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ');
  if (parts.length > 1) {
    return `${parts[0]}.${parts.slice(1).join('')}@asam.local`;
  }
  return `${parts[0]}@asam.local`;
}

// Helper to generate random phone number
function generatePhoneNumber(): string {
  return `555-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
}

// Create Client data - Generate hundreds of clients
async function createClients() {
  console.log('👥 Creating comprehensive client data...');

  // Base client names
  const firstNames = [
    'Robert',
    'Patricia',
    'Michael',
    'Jennifer',
    'David',
    'Elizabeth',
    'Christopher',
    'Barbara',
    'Matthew',
    'Susan',
    'Joseph',
    'Margaret',
    'Charles',
    'Dorothy',
    'Thomas',
    'Lisa',
    'Donald',
    'Nancy',
    'Mark',
    'Betty',
    'Steven',
    'Helen',
    'Paul',
    'Sandra',
    'Andrew',
    'Donna',
    'Joshua',
    'Carol',
    'Kenneth',
    'Ruth',
    'Kevin',
    'Sharon',
    'Brian',
    'Michelle',
    'George',
    'Laura',
    'Edward',
    'Sarah',
    'Ronald',
    'Kimberly',
    'Timothy',
    'Deborah',
    'Jason',
    'Dorothy',
    'Jeffrey',
    'Lisa',
    'Ryan',
    'Nancy',
    'Jacob',
    'Karen',
    'Gary',
    'Betty',
    'Nicholas',
    'Helen',
    'Eric',
    'Sandra',
    'Jonathan',
    'Donna',
    'Stephen',
    'Carol',
    'Larry',
    'Ruth',
    'Justin',
    'Sharon',
    'Scott',
    'Michelle',
    'Brandon',
    'Laura',
    'Benjamin',
    'Sarah',
    'Samuel',
    'Kimberly',
    'Gregory',
    'Deborah',
    'Frank',
    'Dorothy',
    'Raymond',
    'Lisa',
    'Alexander',
    'Nancy',
    'Patrick',
    'Karen',
    'Jack',
    'Betty',
    'Dennis',
    'Helen',
  ];

  const lastNames = [
    'Johnson',
    'Williams',
    'Brown',
    'Davis',
    'Miller',
    'Wilson',
    'Moore',
    'Taylor',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
    'Harris',
    'Martin',
    'Thompson',
    'Garcia',
    'Martinez',
    'Robinson',
    'Clark',
    'Rodriguez',
    'Lewis',
    'Lee',
    'Walker',
    'Hall',
    'Allen',
    'Young',
    'Hernandez',
    'King',
    'Wright',
    'Lopez',
    'Hill',
    'Scott',
    'Green',
    'Adams',
    'Baker',
    'Gonzalez',
    'Nelson',
    'Carter',
    'Mitchell',
    'Perez',
    'Roberts',
    'Turner',
    'Phillips',
    'Campbell',
    'Parker',
    'Evans',
    'Edwards',
    'Collins',
    'Stewart',
    'Sanchez',
    'Morris',
    'Rogers',
    'Reed',
    'Cook',
    'Morgan',
    'Bell',
    'Murphy',
    'Bailey',
    'Rivera',
    'Cooper',
    'Richardson',
    'Cox',
    'Howard',
    'Ward',
    'Torres',
    'Peterson',
    'Gray',
    'Ramirez',
    'James',
    'Watson',
    'Brooks',
    'Kelly',
    'Sanders',
    'Price',
  ];

  const companyTypes = [
    'LLC',
    'Inc',
    'Corp',
    'Group',
    'Services',
    'Solutions',
    'Enterprises',
    'Associates',
    'Partners',
    'Holdings',
    'Industries',
    'Systems',
    'Technologies',
    'Consulting',
    'Management',
    'Development',
    'Properties',
    'Construction',
    'Manufacturing',
    'Logistics',
  ];

  const companyNames = [
    'Premier',
    'Summit',
    'Pinnacle',
    'Elite',
    'Advanced',
    'Professional',
    'Strategic',
    'Global',
    'United',
    'National',
    'Regional',
    'Metro',
    'Central',
    'Coastal',
    'Mountain',
    'Valley',
    'Riverside',
    'Oakwood',
    'Heritage',
    'Legacy',
    'Innovation',
    'Dynamic',
    'Progressive',
    'Excellence',
    'Quality',
    'Reliable',
    'Trusted',
    'Secure',
    'Prime',
  ];

  const clientsToCreate = [];

  // Generate individual clients
  for (let i = 0; i < 300; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;

    clientsToCreate.push({
      name: fullName,
      email: createEmailFromName(fullName),
      phone: generatePhoneNumber(),
      company: undefined,
      notes: `Individual client interested in ${INSURANCE_PRODUCTS[Math.floor(Math.random() * INSURANCE_PRODUCTS.length)]}. Initial consultation completed.`,
      updatedAt: new Date(), // Required field per Prisma schema
      createdAt: new Date(), // Adding createdAt for completeness
    });
  }

  // Generate business clients
  for (let i = 0; i < 150; i++) {
    const companyPrefix = companyNames[Math.floor(Math.random() * companyNames.length)];
    const companySuffix = companyTypes[Math.floor(Math.random() * companyTypes.length)];
    const businessType = [
      'Construction',
      'Healthcare',
      'Technology',
      'Retail',
      'Manufacturing',
      'Consulting',
      'Real Estate',
      'Transportation',
      'Financial',
      'Legal',
    ][Math.floor(Math.random() * 10)];
    const companyName = `${companyPrefix} ${businessType} ${companySuffix}`;

    clientsToCreate.push({
      name: companyName,
      email: `info@${companyPrefix.toLowerCase()}${businessType.toLowerCase()}.asam.local`,
      phone: generatePhoneNumber(),
      company: companyName,
      notes: `Business client requiring ${INSURANCE_PRODUCTS[Math.floor(Math.random() * INSURANCE_PRODUCTS.length)]}. Commercial insurance needs assessment in progress.`,
      updatedAt: new Date(), // Required field per Prisma schema
      createdAt: new Date(), // Adding createdAt for completeness
    });
  }

  // Add the original test clients
  TEST_CLIENTS.forEach((name) => {
    const isCompany =
      name.includes(' LLC') ||
      name.includes(' Inc') ||
      name.includes(' Group') ||
      name.includes(' Services') ||
      name.includes(' Solutions') ||
      name.includes(' Farms') ||
      name.includes(' Manufacturing') ||
      name.includes(' Properties') ||
      name.includes(' Development') ||
      name.includes(' Logistics') ||
      name.includes(' Retail');

    clientsToCreate.push({
      name,
      email: createEmailFromName(name),
      phone: generatePhoneNumber(),
      company: isCompany ? name : undefined,
      notes: `Established client with ongoing ${INSURANCE_PRODUCTS[Math.floor(Math.random() * INSURANCE_PRODUCTS.length)]} needs. Regular policy reviews scheduled.`,
      updatedAt: new Date(), // Required field per Prisma schema
      createdAt: new Date(), // Adding createdAt for completeness
    });
  });

  await prisma.client.createMany({
    data: clientsToCreate,
    skipDuplicates: true,
  });
  console.log(
    `✅ Created ${clientsToCreate.length} clients (${300} individuals + ${150} businesses + ${TEST_CLIENTS.length} test clients)`
  );
}

// Generate Weekly Forecast data for a user
async function generateWeeklyForecastsForUser(
  userId: number,
  role: Role,
  startDate: Date,
  endDate: Date
) {
  console.log(`  📅 Generating weekly forecasts for user ${userId} (${role})...`);
  const forecasts = [];
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  // Define base metrics consistent with WeeklyMetrics type
  let baseMetrics: {
    peopleContacted: number;
    lifeSalesConversations: number;
    sales: number;
    referralRequests: number;
  };

  if (role === Role.SALES || role === Role.SALES_LEAD) {
    baseMetrics = {
      peopleContacted: 50,
      lifeSalesConversations: 15,
      sales: 5,
      referralRequests: 20,
    };
  } else if (role === Role.SERVICE || role === Role.SERVICE_LEAD) {
    baseMetrics = {
      peopleContacted: 30,
      lifeSalesConversations: 5,
      sales: 1,
      referralRequests: 10,
    };
  } else {
    baseMetrics = { peopleContacted: 0, lifeSalesConversations: 0, sales: 0, referralRequests: 0 };
  }

  while (currentWeekStart <= endDate) {
    // Generate forecast data aligned with WeeklyMetrics
    const forecastEntry: {
      peopleContacted: number;
      lifeSalesConversations: number;
      sales: number;
      referralRequests: number;
    } = {
      peopleContacted: Math.max(
        0,
        baseMetrics.peopleContacted + Math.floor(Math.random() * 11) - 5
      ), // +/- 5
      lifeSalesConversations: Math.max(
        0,
        baseMetrics.lifeSalesConversations + Math.floor(Math.random() * 7) - 3
      ), // +/- 3
      sales: Math.max(0, baseMetrics.sales + Math.floor(Math.random() * 5) - 2), // +/- 2
      referralRequests: Math.max(
        0,
        baseMetrics.referralRequests + Math.floor(Math.random() * 11) - 5
      ), // +/- 5
    };

    // DYNAMIC DEBUG LOGGING START
    const currentUserForForecast = await prisma.user.findUnique({ where: { id: userId } });
    if (
      currentUserForForecast?.username === 'sales_lead' &&
      currentWeekStart.toISOString().startsWith('2025-05-26')
    ) {
      console.log(
        `\nDEBUG: USER ${currentUserForForecast.username} (ID: ${userId}), WEEK 2025-05-26 in generateWeeklyForecastsForUser`
      );
      console.log(
        `  currentWeekStart (before UTC conversion for DB): ${currentWeekStart.toISOString()}`
      );
      console.log(`  Forecast entry being prepared: ${JSON.stringify(forecastEntry)}`);
    }
    // DYNAMIC DEBUG LOGGING END

    forecasts.push({
      userId,
      weekStartDate: currentWeekStart,
      forecast: forecastEntry,
    });

    currentWeekStart = addDays(currentWeekStart, 7);
  }

  if (forecasts.length > 0) {
    await prisma.weeklyForecast.createMany({
      data: forecasts.map((f) => {
        const forecastWeekStartUTC = new Date(
          Date.UTC(
            f.weekStartDate.getUTCFullYear(),
            f.weekStartDate.getUTCMonth(),
            f.weekStartDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        // DYNAMIC DEBUG LOGGING START
        // Fetch user for username, as f.userId is just the ID here
        if (forecastWeekStartUTC.toISOString().startsWith('2025-05-26')) {
          // This inner check is tricky without fetching user again,
          // so we rely on the outer check or log for all users for this specific week.
        }
        // DYNAMIC DEBUG LOGGING END
        return {
          userId: f.userId,
          weekStartDate: forecastWeekStartUTC,
          forecast: f.forecast,
          updatedAt: new Date(), // Required field per Prisma schema
          createdAt: new Date(), // Adding createdAt for completeness
        };
      }),
      skipDuplicates: true,
    });
    // DYNAMIC DEBUG LOGGING for verification after createMany
    const salesLeadUser = await prisma.user.findUnique({ where: { username: 'sales_lead' } });
    if (
      salesLeadUser &&
      forecasts.some(
        (f) =>
          f.userId === salesLeadUser.id && f.weekStartDate.toISOString().startsWith('2025-05-26')
      )
    ) {
      const verifyForecast = await prisma.weeklyForecast.findFirst({
        where: {
          userId: salesLeadUser.id,
          weekStartDate: new Date(Date.UTC(2025, 5 - 1, 26, 0, 0, 0, 0)),
        },
      });
      console.log(
        `  Forecast for USER sales_lead (ID: ${salesLeadUser.id}), WEEK 2025-05-26 after createMany: Record ${verifyForecast ? 'EXISTS' : 'MISSING'}`
      );
      if (verifyForecast)
        console.log(
          `  Verified Forecast weekStartDate: ${verifyForecast.weekStartDate.toISOString()}`
        );
      console.log(`----------------------------------------------------`);
    }

    // console.log(`    ✅ Created ${forecasts.length} weekly forecasts for user ${userId}`); // Keep this general one
  }
}

// Generate realistic performance targets for all users
async function generatePerformanceTargets(
  users: Record<string, any>,
  startDate: Date,
  endDate: Date
) {
  console.log('🎯 Generating realistic performance targets...');

  const targetsByRole = {
    [Role.SALES]: {
      peopleContacted: 100,
      lifeSalesConversations: 25,
      sales: 8,
      referralRequests: 15,
      premiumAmount: 12000,
    },
    [Role.SALES_LEAD]: {
      peopleContacted: 120,
      lifeSalesConversations: 30,
      sales: 12,
      referralRequests: 20,
      premiumAmount: 18000,
    },
    [Role.SERVICE]: {
      peopleContacted: 60,
      lifeSalesConversations: 10,
      sales: 3,
      referralRequests: 8,
      premiumAmount: 5000,
    },
    [Role.SERVICE_LEAD]: {
      peopleContacted: 80,
      lifeSalesConversations: 15,
      sales: 5,
      referralRequests: 12,
      premiumAmount: 8000,
    },
  };

  const allUsers = [
    ...(users.salesAgents || []),
    ...(users.serviceAgents || []),
    users.salesLead,
    users.serviceLead,
  ].filter(Boolean);

  const targets = [];
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  while (currentWeekStart <= endDate) {
    for (const user of allUsers) {
      const baseTargets = targetsByRole[user.role as keyof typeof targetsByRole] || targetsByRole[Role.SALES];

      // Add some weekly variance (±20%) to make it realistic
      const variance = 0.8 + Math.random() * 0.4; // 80% to 120%

      targets.push({
        userId: user.id,
        weekStartDate: new Date(currentWeekStart),
        peopleContacted: Math.round(baseTargets.peopleContacted * variance),
        lifeSalesConversations: Math.round(baseTargets.lifeSalesConversations * variance),
        sales: Math.round(baseTargets.sales * variance),
        referralRequests: Math.round(baseTargets.referralRequests * variance),
        premiumAmount: Math.round(baseTargets.premiumAmount * variance),
        setById: users.manager?.id || users.admin?.id, // Set by manager
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    currentWeekStart = addDays(currentWeekStart, 7);
  }

  if (targets.length > 0) {
    await prisma.performanceTarget.createMany({
      data: targets,
      skipDuplicates: true,
    });
    console.log(`✅ Created ${targets.length} performance targets`);
  }
}

// Add comprehensive daily activity data generation for lead users
async function generateComprehensiveDailyActivitiesForLeads(
  users: Record<string, any>,
  startDate: Date,
  endDate: Date
) {
  console.log('\n📊 Generating comprehensive daily activity data for lead users...');

  const leadsToProcess = [];
  if (users.salesLead) leadsToProcess.push({ user: users.salesLead, role: 'sales' });
  if (users.serviceLead) leadsToProcess.push({ user: users.serviceLead, role: 'service' });

  for (const { user, role } of leadsToProcess) {
    console.log(`  📅 Generating daily activities for ${user.name} (${user.username})...`);

    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const endWeekStart = startOfWeek(endDate, { weekStartsOn: 1 });

    while (currentWeekStart <= endWeekStart) {
      const weeklyData: WeeklyActivityData = {
        monday: generateDayActivity(role),
        tuesday: generateDayActivity(role),
        wednesday: generateDayActivity(role),
        thursday: generateDayActivity(role),
        friday: generateDayActivity(role),
      };

      // Ensure we have realistic variations and patterns
      if (role === 'sales') {
        // Sales leads typically have higher numbers
        adjustForSalesLead(weeklyData);
      } else {
        // Service leads have different patterns
        adjustForServiceLead(weeklyData);
      }

      // Create or update the weekly activity record
      await prisma.weeklyActivity.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: currentWeekStart,
          },
        },
        update: {
          data: weeklyData,
          weekStartDate: currentWeekStart,
        },
        create: {
          date: currentWeekStart,
          weekStartDate: currentWeekStart,
          data: weeklyData,
          updatedAt: new Date(), // Required field per Prisma schema
          User: {
            connect: { id: user.id } // This establishes the userId field properly
          },
        },
      });

      currentWeekStart = addDays(currentWeekStart, 7);
    }

    console.log(`    ✅ Generated comprehensive daily activities for ${user.name}`);
  }
}

// Helper function to generate realistic daily activity for a single day
function generateDayActivity(role: string): DayActivities {
  if (role === 'sales') {
    return {
      closed: {
        auto: Math.floor(Math.random() * 4) + 2, // 2-5 auto sales
        lifeHealth: Math.floor(Math.random() * 3) + 1, // 1-3 life/health sales
        fire: Math.floor(Math.random() * 2) + 1, // 1-2 property/fire sales
      },
      quotes: Math.floor(Math.random() * 8) + 12, // 12-19 quotes
      dials: Math.floor(Math.random() * 20) + 60, // 60-79 dials
      referrals: {
        ask: Math.floor(Math.random() * 8) + 7, // 7-14 referral requests
        received: Math.floor(Math.random() * 4) + 3, // 3-6 referrals received
      },
    };
  } else {
    // Service role - lower sales numbers, focus on service activities
    return {
      closed: {
        auto: Math.floor(Math.random() * 2), // 0-1 auto sales
        lifeHealth: Math.floor(Math.random() * 2), // 0-1 life/health sales
        fire: Math.random() > 0.7 ? 1 : 0, // Occasionally 1 property/fire sale
      },
      quotes: Math.floor(Math.random() * 5) + 5, // 5-9 quotes
      dials: Math.floor(Math.random() * 15) + 35, // 35-49 dials
      referrals: {
        ask: Math.floor(Math.random() * 5) + 3, // 3-7 referral requests
        received: Math.floor(Math.random() * 3) + 1, // 1-3 referrals received
      },
    };
  }
}

// Adjust data for sales lead to show leadership performance
function adjustForSalesLead(weeklyData: WeeklyActivityData) {
  // Sales leads typically have higher performance on certain days
  const days: (keyof WeeklyActivityData)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ];

  // Make Tuesday and Thursday stronger days
  weeklyData.tuesday.closed.auto += 2;
  weeklyData.tuesday.quotes += 5;
  weeklyData.thursday.closed.lifeHealth += 1;
  weeklyData.thursday.quotes += 4;

  // Ensure minimum values across the week
  days.forEach((day) => {
    const dayData = weeklyData[day];
    dayData.dials = Math.max(dayData.dials, 50);
    dayData.quotes = Math.max(dayData.quotes, 10);
  });
}

// Adjust data for service lead
function adjustForServiceLead(weeklyData: WeeklyActivityData) {
  // Service leads focus more on client retention and service
  const days: (keyof WeeklyActivityData)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ];

  // Service patterns - more consistent but lower sales
  days.forEach((day) => {
    const dayData = weeklyData[day];
    dayData.dials = Math.max(dayData.dials, 30);
    dayData.quotes = Math.max(dayData.quotes, 5);

    // Service leads have better referral conversion
    if (dayData.referrals.ask > 0) {
      dayData.referrals.received = Math.min(
        dayData.referrals.ask,
        Math.floor(dayData.referrals.ask * 0.6)
      );
    }
  });
}

// Main seeding function
async function main() {
  console.log('🚀 Starting enhanced database seeding...\n');

  // Check if we should reset first
  const shouldReset = process.argv.includes('--reset');
  if (shouldReset) {
    await clearAllData();
  }

  // Create users
  const users = await createBaseUsers();

  // For development and test environments, add comprehensive test data
  if (DATABASE_NAME !== 'asam') {
    console.log('\n👥 Creating clients for dev/test environment...');
    await createClients(); // Create client data

    console.log('\n📅 Generating comprehensive activity data from September 1, 2024 to June 6, 2025...');
    console.log('🎯 Enhanced coverage: 8+ months of equitable data distribution across all roles');

    const startDate = new Date('2024-09-01');
    const endDate = new Date('2025-06-06'); // Extended date range for comprehensive historical data

    // Generate activities for all agents
    const allAgents = [...(users.salesAgents || []), ...(users.serviceAgents || [])];

    for (const agent of allAgents) {
      await generateActivitiesForUser(agent.id, startDate, endDate, agent.role);
      await generateTasksForUser(agent.id, agent.role);
      await generateWeeklyForecastsForUser(agent.id, agent.role, startDate, endDate); // Generate forecasts
    }

    // Also generate for leads
    if (users.salesLead) {
      await generateActivitiesForUser(users.salesLead.id, startDate, endDate, users.salesLead.role);
      await generateTasksForUser(users.salesLead.id, users.salesLead.role);
      await generateWeeklyForecastsForUser(
        users.salesLead.id,
        users.salesLead.role,
        startDate,
        endDate
      ); // Generate forecasts
    }

    if (users.serviceLead) {
      await generateActivitiesForUser(
        users.serviceLead.id,
        startDate,
        endDate,
        users.serviceLead.role
      );
      await generateTasksForUser(users.serviceLead.id, users.serviceLead.role);
      await generateWeeklyForecastsForUser(
        users.serviceLead.id,
        users.serviceLead.role,
        startDate,
        endDate
      ); // Generate forecasts
    }

    // Generate sales metrics
    await generateSalesMetrics();

    // Generate WeeklyActivity records from the activities
    await generateWeeklyActivitiesFromSeed();

    // Generate comprehensive daily activity data for lead users
    await generateComprehensiveDailyActivitiesForLeads(users, startDate, endDate);

    // Generate realistic performance targets
    await generatePerformanceTargets(users, startDate, endDate);
  }

  // Print summary
  console.log('\n📋 Seeding Summary:');
  console.log('==================');

  const userCount = await prisma.user.count();
  const activityCount = await prisma.activity.count();
  const taskCount = await prisma.task.count();
  const metricCount = await prisma.salesMetric.count();
  const clientCount = await prisma.client.count();
  const weeklyActivityCount = await prisma.weeklyActivity.count();
  const weeklyForecastCount = await prisma.weeklyForecast.count();
  const performanceTargetCount = await prisma.performanceTarget.count();

  console.log(`👥 Users: ${userCount}`);
  console.log(`📝 Clients: ${clientCount}`);
  console.log(`📊 Activities: ${activityCount}`);
  console.log(`📋 Tasks: ${taskCount}`);
  console.log(`📈 Sales Metrics: ${metricCount}`);
  console.log(`🗓️ Weekly Activities: ${weeklyActivityCount}`);
  console.log(`🔮 Weekly Forecasts: ${weeklyForecastCount}`);
  console.log(`🎯 Performance Targets: ${performanceTargetCount}`);

  // Print credentials
  console.log('\n🔐 Login Credentials:');
  console.log('===================');
  console.log('Admin Username: admin | Password: adminpass');
  console.log('All other users (Managers, Leads, Agents) | Password: agent123');

  const allUsers = await prisma.user.findMany({
    include: { User: true }, // This is the correct relation name for manager in Prisma schema
    orderBy: { id: 'asc' },
  });

  const tableRows = allUsers.map((user) => {
    const reportsTo = user.User ? user.User.username : 'N/A';
    return `| ${user.username.padEnd(14)} | ${user.role.padEnd(14)} | ${user.name.padEnd(19)} | ${reportsTo.padEnd(14)} |`;
  });

  console.log('| Username       | Role           | Name                | Reports To     |');
  console.log('|----------------|----------------|---------------------|----------------|');
  console.log(tableRows.join('\n'));

  console.log('\n✅ Enhanced seeding completed successfully!');
}

// Run the seeding
main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
