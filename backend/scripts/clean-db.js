#!/usr/bin/env node

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function promptConfirmation(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function cleanDatabase() {
  console.log(`\n${RED}${'═'.repeat(55)}${RESET}`);
  console.log(`${RED}  ⚠️  DATABASE CLEANUP - ALL DATA WILL BE DELETED ⚠️${RESET}`);
  console.log(`${RED}${'═'.repeat(55)}${RESET}\n`);

  console.log(`${YELLOW}This will delete ALL data from ALL tables.${RESET}`);
  console.log(`${YELLOW}Schema & tables will remain intact.${RESET}\n`);

  const confirmation = await promptConfirmation(
    `${YELLOW}Type 'DELETE ALL DATA' to confirm: ${RESET}`
  );

  rl.close();

  if (confirmation !== 'DELETE ALL DATA') {
    console.log(`\n${RED}Cancelled - no data was deleted${RESET}\n`);
    process.exit(0);
  }

  console.log(`\n${YELLOW}Fetching tables...${RESET}\n`);

  try {
    // Disable foreign key checks
    await prisma.$executeRawUnsafe(`SET session_replication_role = replica;`);

    // Get all tables dynamically
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);

    if (!tables.length) {
      console.log(`${YELLOW}⚠️ No tables found in database${RESET}`);
    }

    for (const row of tables) {
      const table = row.tablename;

      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`  ✓ Cleared: ${table}`);
      } catch (err) {
        console.log(`  ⚠️ Skipped: ${table} (${err.message})`);
      }
    }

    // Re-enable constraints
    await prisma.$executeRawUnsafe(`SET session_replication_role = default;`);

    console.log(`\n${GREEN}✓ Database cleanup complete!${RESET}`);
    console.log(`${GREEN}✓ All data has been deleted${RESET}`);
    console.log(`${GREEN}✓ Schema remains intact${RESET}\n`);
  } catch (error) {
    console.error(`\n${RED}✗ Fatal error:${RESET}`, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
