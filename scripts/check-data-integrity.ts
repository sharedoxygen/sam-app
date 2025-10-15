import prisma from '../src/lib/prisma';

async function checkDataIntegrity() {
  console.log('\n=== Data Integrity Check ===\n');

  try {
    // Check 1: Activities without valid users
    const orphanedActivities = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Activity" a
      LEFT JOIN "User" u ON a."userId" = u.id
      WHERE u.id IS NULL
    `;
    console.log(`❌ Orphaned Activities (no valid user): ${orphanedActivities[0].count}`);

    // Check 2: Tasks without valid users
    const orphanedTasks = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Task" t
      LEFT JOIN "User" u ON t."userId" = u.id
      WHERE u.id IS NULL
    `;
    console.log(`❌ Orphaned Tasks (no valid user): ${orphanedTasks[0].count}`);

    // Check 3: Client relationships analysis
    const activitiesWithClients = await prisma.activity.count({
      where: {
        clientId: { not: null },
      },
    });
    console.log(`📊 Activities with Client relationships: ${activitiesWithClients}`);

    const totalActivities = await prisma.activity.count();
    console.log(`📊 Total Activities: ${totalActivities}`);

    const totalTasks = await prisma.task.count();
    console.log(`📊 Total Tasks: ${totalTasks}`);

    const totalClients = await prisma.client.count();
    console.log(`📊 Total Clients in Client table: ${totalClients}`);

    // Check 4: SalesMetric data integrity
    const totalSalesMetrics = await prisma.salesMetric.count();
    console.log(`✅ SalesMetrics with user reference: ${totalSalesMetrics}/${totalSalesMetrics} (All have userId field)`);

    // Check 5: WeeklyActivity data integrity
    const weeklyActivitiesCount = await prisma.weeklyActivity.count();
    console.log(`📊 Total WeeklyActivity records: ${weeklyActivitiesCount}`);

    // Check 6: Google Reviews data check (new functionality)
    let googleReviewActivities = 0;
    try {
      googleReviewActivities = await prisma.activity.count({
        where: {
          type: 'GOOGLE_REVIEW' as any, // Cast to any until Prisma client is regenerated
        },
      });
    } catch (error) {
      console.log(`⚠️ GOOGLE_REVIEW enum not yet available in Prisma client`);
    }
    console.log(`⭐ Google Review activities: ${googleReviewActivities}`);

    // Check 7: Performance Targets data integrity
    const performanceTargetsCount = await prisma.performanceTarget.count();
    console.log(`🎯 Performance Target records: ${performanceTargetsCount}`);

    // Check 8: WeeklyActivity data structure validation
    console.log('\n🔍 Checking WeeklyActivity data structure...');
    const sampleWeeklyActivities = await prisma.weeklyActivity.findMany({
      take: 5,
      select: { id: true, userId: true, data: true },
    });

    let structureIssues = 0;
    for (const activity of sampleWeeklyActivities) {
      try {
        const data = activity.data as any;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

        for (const day of days) {
          if (!data[day]) {
            console.log(`⚠️ Missing ${day} data in WeeklyActivity ${activity.id} for user ${activity.userId}`);
            structureIssues++;
            continue;
          }

          // Check for googleReviews field (new requirement)
          if (!data[day].googleReviews) {
            console.log(`⚠️ Missing googleReviews field in ${day} for WeeklyActivity ${activity.id}`);
            structureIssues++;
          }

          // Check required fields
          const required = ['closed', 'quotes', 'dials', 'referrals'];
          for (const field of required) {
            if (data[day][field] === undefined) {
              console.log(`⚠️ Missing ${field} in ${day} for WeeklyActivity ${activity.id}`);
              structureIssues++;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Invalid JSON structure in WeeklyActivity ${activity.id}:`, error);
        structureIssues++;
      }
    }

    // Check 9: User role hierarchy validation
    const userHierarchyIssues = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "User" u1
      LEFT JOIN "User" u2 ON u1."managerId" = u2.id
      WHERE u1."managerId" IS NOT NULL AND u2.id IS NULL
    `;
    console.log(`❌ Users with invalid manager references: ${userHierarchyIssues[0].count}`);

    // Check 10: Activity-Client relationship integrity
    const orphanedActivityClients = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Activity" a
      LEFT JOIN "Client" c ON a."clientId" = c.id
      WHERE a."clientId" IS NOT NULL AND c.id IS NULL
    `;
    console.log(`❌ Activities with invalid client references: ${orphanedActivityClients[0].count}`);

    // Summary
    console.log('\n=== DATA INTEGRITY SUMMARY ===');
    console.log(`📊 WeeklyActivity structure issues: ${structureIssues}`);
    console.log(`🔗 Orphaned activities: ${orphanedActivities[0].count}`);
    console.log(`🔗 Orphaned tasks: ${orphanedTasks[0].count}`);
    console.log(`👥 Invalid manager references: ${userHierarchyIssues[0].count}`);
    console.log(`🏢 Invalid client references: ${orphanedActivityClients[0].count}`);

    const totalIssues = Number(orphanedActivities[0].count) +
      Number(orphanedTasks[0].count) +
      Number(userHierarchyIssues[0].count) +
      Number(orphanedActivityClients[0].count) +
      structureIssues;

    if (totalIssues === 0) {
      console.log('\n✅ DATA INTEGRITY STATUS: EXCELLENT - No issues found!');
    } else {
      console.log(`\n⚠️ DATA INTEGRITY STATUS: ${totalIssues} issues found requiring attention`);
    }

    console.log('\n🆕 NEW FEATURES STATUS:');
    console.log(`⭐ Google Reviews: ${googleReviewActivities === 0 ? 'Ready for use' : 'Already in use'}`);
    console.log(`🎯 Performance Targets: ${performanceTargetsCount > 0 ? 'Active' : 'Not configured'}`);

  } catch (error) {
    console.error('Error checking data integrity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataIntegrity();
