#!/usr/bin/env ts-node

/**
 * Database Email Domain Sanitization Script
 * 
 * This script updates all email addresses in the database to use the safe
 * local domain @asam.local instead of potentially real email addresses.
 * 
 * IMPORTANT: This is a data sanitization operation.
 * 
 * Usage:
 *   npx ts-node scripts/sanitize-email-domains.ts
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

async function sanitizeEmailDomains() {
  console.log('🔒 Starting email domain sanitization...\n');

  try {
    // Get all users with email addresses
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    console.log(`📧 Found ${users.length} users to process`);

    let usersUpdated = 0;
    for (const user of users) {
      if (user.email && !user.email.endsWith('@asam.local')) {
        // Extract the local part of the email (before @)
        const localPart = user.email.split('@')[0];
        const newEmail = `${localPart}@asam.local`;

        await prisma.user.update({
          where: { id: user.id },
          data: { email: newEmail },
        });

        console.log(`  ✅ Updated: ${user.username} (${user.email} → ${newEmail})`);
        usersUpdated++;
      } else {
        console.log(`  ⏭️  Skipped: ${user.username} (already @asam.local)`);
      }
    }

    console.log(`\n✅ Users updated: ${usersUpdated}/${users.length}`);

    // Get all clients with email addresses
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    console.log(`\n📧 Found ${clients.length} clients to process`);

    let clientsUpdated = 0;
    
    // First, get all existing emails to detect duplicates
    const existingEmails = new Set(
      clients
        .filter(c => c.email)
        .map(c => c.email)
    );
    
    for (const client of clients) {
      if (client.email && !client.email.endsWith('@asam.local')) {
        // Extract the local part of the email (before @)
        let localPart = client.email.split('@')[0];
        let newEmail = `${localPart}@asam.local`;
        
        // Handle duplicate emails by appending client ID
        let counter = 1;
        while (existingEmails.has(newEmail)) {
          newEmail = `${localPart}.${counter}@asam.local`;
          counter++;
        }
        existingEmails.add(newEmail);

        try {
          await prisma.client.update({
            where: { id: client.id },
            data: { email: newEmail },
          });

          console.log(`  ✅ Updated: ${client.name} (${client.email} → ${newEmail})`);
          clientsUpdated++;
        } catch (error: any) {
          console.log(`  ⚠️  Failed: ${client.name} - ${error.message}`);
        }
      } else {
        console.log(`  ⏭️  Skipped: ${client.name} (already @asam.local or null)`);
      }
    }

    console.log(`\n✅ Clients updated: ${clientsUpdated}/${clients.length}`);
    console.log('\n🎉 Email domain sanitization completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Users processed: ${users.length} (${usersUpdated} updated)`);
    console.log(`   - Clients processed: ${clients.length} (${clientsUpdated} updated)`);

  } catch (error) {
    console.error('❌ Error during email sanitization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sanitization if this script is executed directly
if (require.main === module) {
  sanitizeEmailDomains()
    .then(() => {
      console.log('\n✨ Sanitization script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Sanitization script failed:', error);
      process.exit(1);
    });
}

export { sanitizeEmailDomains };

