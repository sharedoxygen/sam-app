import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

async function migrateToAdmin() {
  console.log('🔄 Migrating admin user from "angela" to "admin"...\n');
  
  // Check if 'angela' exists
  const angelaUser = await prisma.user.findUnique({
    where: { username: 'angela' }
  });
  
  // Check if 'admin' exists
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });
  
  if (adminUser) {
    console.log('✅ Admin user already exists');
    console.log('   Username:', adminUser.username);
    console.log('   Name:', adminUser.name);
    console.log('   Role:', adminUser.role);
    
    if (angelaUser) {
      console.log('\n⚠️  Old "angela" user still exists - deleting...');
      await prisma.user.delete({ where: { username: 'angela' } });
      console.log('✅ Deleted old "angela" user');
    }
  } else if (angelaUser) {
    console.log('🔄 Migrating "angela" to "admin"...');
    
    // Update username from 'angela' to 'admin'
    await prisma.user.update({
      where: { username: 'angela' },
      data: { 
        username: 'admin',
        name: 'System Administrator',
        email: 'admin@asam.local'
      }
    });
    
    console.log('✅ Successfully migrated to "admin"');
  } else {
    console.log('⚠️  Neither "angela" nor "admin" user exists');
    console.log('   Running seed to create admin user...');
  }
  
  await prisma.$disconnect();
}

migrateToAdmin();
