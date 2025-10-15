import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

async function testLogin() {
  console.log('🔍 Testing possible admin login combinations:\n');
  
  const testCombos = [
    { username: 'angela', password: 'adminpass' },
    { username: 'Angela', password: 'adminpass' },
    { username: 'admin', password: 'adminpass' },
    { username: 'angela', password: 'admin' },
    { username: 'admin', password: 'admin' }
  ];
  
  for (const combo of testCombos) {
    const user = await prisma.user.findUnique({
      where: { username: combo.username.toLowerCase() }
    });
    
    if (!user) {
      console.log(`❌ ${combo.username} / ${combo.password} - User not found`);
      continue;
    }
    
    const isValid = await bcrypt.compare(combo.password, user.password);
    console.log(`${isValid ? '✅' : '❌'} ${combo.username} / ${combo.password} - ${isValid ? 'VALID' : 'Invalid'}`);
  }
  
  console.log('\n📋 All users in database:');
  const allUsers = await prisma.user.findMany({
    select: { username: true, name: true, role: true }
  });
  
  for (const user of allUsers) {
    console.log(`  - ${user.username} (${user.name}) - ${user.role}`);
  }
  
  await prisma.$disconnect();
}

testLogin();
