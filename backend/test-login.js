import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function test() {
  console.log('Testing login...\n');

  const email = 'admin@travelcrm.com';
  const password = 'admin123';

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('❌ User not found in database');
    console.log('\nExisting users:');
    const users = await prisma.user.findMany();
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    return;
  }

  console.log(`✅ User found: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   isActive: ${user.isActive}`);
  console.log(`   Password hash: ${user.passwordHash.substring(0, 30)}...`);

  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log(`   Password match: ${isValid}`);

  if (isValid) {
    console.log('\n✅ Login would succeed!');
  } else {
    console.log('\n❌ Password mismatch - regenerating hash...');

    // Re-generate password hash
    const newHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: newHash },
    });
    console.log('✅ Password hash updated');
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
