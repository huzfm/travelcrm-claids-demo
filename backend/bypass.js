/**
 * Create an admin user using Prisma Client (matches your actual schema).
 * Usage: node bypass.js
 *
 * Install deps first (if not already installed):
 *   pnpm add bcryptjs
 *
 * Make sure @prisma/client is already generated:
 *   npx prisma generate
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ⚠️ Update these values
const ADMIN_NAME = "Super Admin";
const ADMIN_EMAIL = "admin@azees.com";
const ADMIN_PHONE = "7006080808"; // required + unique in your schema
const ADMIN_PASSWORD = "123456";
const BRANCH_ID = "branch-main"; // required - see note below

async function createAdmin() {
  try {
    if (!BRANCH_ID || BRANCH_ID === "PASTE_YOUR_BRANCH_ID_HERE") {
      // Try to auto-pick the first/main branch if one exists
      const branch = await prisma.branch.findFirst({
        orderBy: { isMain: "desc" },
      });

      if (!branch) {
        console.error(
          "No branch found in the database. Create a branch first - every user requires a branchId."
        );
        return;
      }

      console.log(`No BRANCH_ID set - using existing branch: ${branch.name} (${branch.id})`);
      await upsertAdmin(branch.id);
      return;
    }

    await upsertAdmin(BRANCH_ID);
  } catch (err) {
    console.error("Error creating admin user:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function upsertAdmin(branchId) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      passwordHash,
      role: "ADMIN",
      branchId,
      isActive: true,
    },
  });

  console.log("Admin user created/updated:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    branchId: admin.branchId,
  });
}

createAdmin();