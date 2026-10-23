/**
 * Bulk Create User WhatsApp Instances
 *
 * One-time script to create WhatsApp instances for all existing users
 * who don't have an evolution_instance_name set.
 *
 * Usage: node scripts/bulkCreateInstances.js
 *
 * Features:
 * - Creates one instance per user
 * - Waits 500ms between creations to avoid rate limiting
 * - Logs progress: "Created instance for user X (Y/Z)"
 * - Logs failures without stopping the script
 * - Instance name format: crm_branch{branchId}_user{userId}
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  createInstance,
  getInstanceStatus,
  generateInstanceName,
} from '../src/services/user-evolution.service.js';

const prisma = new PrismaClient();

const DELAY_MS = 500;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const run = async () => {
  console.log('===========================================');
  console.log('  Bulk Create User WhatsApp Instances');
  console.log('===========================================');
  console.log(`Evolution API URL: ${process.env.EVOLUTION_API_URL}`);
  console.log(
    `API Key: ${process.env.EVOLUTION_API_KEY ? '***' + process.env.EVOLUTION_API_KEY.slice(-4) : 'NOT SET'}`
  );
  console.log('');

  // Fetch all users without an evolution instance
  const users = await prisma.user.findMany({
    where: {
      evolutionInstanceName: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      branchId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (users.length === 0) {
    console.log('No users need WhatsApp instances. All users are already set up!');
    process.exit(0);
  }

  console.log(`Found ${users.length} users without WhatsApp instances\n`);

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    failures: [],
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `(${i + 1}/${users.length})`;

    try {
      console.log(`Processing ${progress} User: ${user.name} (${user.email})...`);

      // Check if instance already exists in Evolution API
      const instanceName = generateInstanceName(user.id, user.branchId);
      const existingStatus = await getInstanceStatus(instanceName);

      if (existingStatus.success && existingStatus.state !== 'NOT_FOUND') {
        // Instance exists in Evolution API but not in our DB - update it
        console.log(`  Instance already exists in Evolution API, updating record...`);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            evolutionInstanceName: instanceName,
            evolutionStatus: existingStatus.state,
            evolutionPhoneNumber: existingStatus.phone,
            evolutionCreatedAt: new Date(),
          },
        });

        results.skipped++;
        console.log(`  ✓ Updated existing instance: ${instanceName} (${existingStatus.state})`);
      } else {
        // Create new instance
        const result = await createInstance({ id: user.id, branchId: user.branchId });

        if (result.success) {
          // Save to user record
          await prisma.user.update({
            where: { id: user.id },
            data: {
              evolutionInstanceName: result.instanceName,
              evolutionInstanceToken: result.token,
              evolutionStatus: 'created',
              evolutionCreatedAt: new Date(),
            },
          });

          results.success++;
          console.log(
            `  ✓ Created instance: ${result.instanceName}${result.token ? ' (has token)' : ' (no token)'}`
          );
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      }

      // Wait between requests
      if (i < users.length - 1) {
        await sleep(DELAY_MS);
      }
    } catch (error) {
      results.failed++;
      results.failures.push({
        userId: user.id,
        email: user.email,
        error: error.message,
      });
      console.log(`  ✗ Failed: ${error.message}`);
    }
  }

  console.log('\n===========================================');
  console.log('  Summary');
  console.log('===========================================');
  console.log(`Total users processed: ${users.length}`);
  console.log(`Successfully created: ${results.success}`);
  console.log(`Updated existing:     ${results.skipped}`);
  console.log(`Failed:               ${results.failed}`);

  if (results.failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of results.failures) {
      console.log(`  - ${failure.email}: ${failure.error}`);
    }
  }

  await prisma.$disconnect();

  if (results.failed > 0) {
    console.log('\n⚠️  Some users failed. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✓ All instances created successfully!');
  process.exit(0);
};

run().catch(async error => {
  console.error('Script failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
