import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import prisma from '../src/lib/prisma';

config({ path: '.env.local' });
config({ path: '.env' });

async function testProtection() {
  console.log('🧪 Testing admin user protection...\n');
  
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });
  
  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }
  
  console.log('✅ Admin user found:', admin.username, admin.name);
  console.log('\n📋 Testing protection mechanisms:\n');
  
  // Test 1: Try to delete admin
  console.log('1️⃣  Attempting to delete admin user...');
  try {
    await prisma.user.delete({ where: { username: 'admin' } });
    console.log('   ❌ FAILED: Admin was deleted (protection not working!)');
  } catch (error: any) {
    console.log('   ✅ PROTECTED:', error.message);
  }
  
  // Test 2: Try to change username
  console.log('\n2️⃣  Attempting to change admin username...');
  try {
    await prisma.user.update({ 
      where: { username: 'admin' },
      data: { username: 'superadmin' }
    });
    console.log('   ❌ FAILED: Username was changed (protection not working!)');
  } catch (error: any) {
    console.log('   ✅ PROTECTED:', error.message);
  }
  
  // Test 3: Try to change role
  console.log('\n3️⃣  Attempting to change admin role...');
  try {
    await prisma.user.update({ 
      where: { username: 'admin' },
      data: { role: 'OFFICE_MANAGER' }
    });
    console.log('   ❌ FAILED: Role was changed (protection not working!)');
  } catch (error: any) {
    console.log('   ✅ PROTECTED:', error.message);
  }
  
  // Test 4: Verify allowed updates (password, email, name)
  console.log('\n4️⃣  Testing allowed updates (password, email)...');
  try {
    const updated = await prisma.user.update({ 
      where: { username: 'admin' },
      data: { 
        email: 'admin@asam.local',
        name: 'System Administrator'
      }
    });
    console.log('   ✅ ALLOWED: Legitimate updates work correctly');
  } catch (error: any) {
    console.log('   ❌ FAILED:', error.message);
  }
  
  console.log('\n✅ All protection tests completed!');
  
  await prisma.$disconnect();
}

testProtection();
