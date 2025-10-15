import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.user.findUnique({
    where: { username: 'angela' },
    select: { id: true, username: true, email: true, role: true, password: true }
  });
  
  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }
  
  console.log('Admin user found:');
  console.log('  Username:', admin.username);
  console.log('  Email:', admin.email);
  console.log('  Role:', admin.role);
  console.log('  Password hash:', admin.password.substring(0, 20) + '...');
  
  // Test the password
  const testPassword = 'adminpass';
  const matches = await bcrypt.compare(testPassword, admin.password);
  console.log('\n✅ Password "adminpass" matches:', matches ? '✅ YES' : '❌ NO');
  
  // Also test agent123
  const matches2 = await bcrypt.compare('agent123', admin.password);
  console.log('✅ Password "agent123" matches:', matches2 ? '✅ YES' : '❌ NO');
  
  // Test admin
  const matches3 = await bcrypt.compare('admin', admin.password);
  console.log('✅ Password "admin" matches:', matches3 ? '✅ YES' : '❌ NO');
  
  await prisma.$disconnect();
}

checkAdmin();

