/**
 * Force delete the test admin user, cleaning up its single audit log entry first.
 * Usage: node force-delete-admin.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "admin@azees.com";

async function forceDelete() {
  try {
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (!user) {
      console.log("User not found - already deleted.");
      return;
    }

    // Delete dependent audit log entries first
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: { userId: user.id },
    });
    console.log(`Deleted ${deletedLogs.count} audit log(s).`);

    // Now delete the user
    const deletedUser = await prisma.user.delete({
      where: { id: user.id },
    });

    console.log("User deleted:", {
      id: deletedUser.id,
      email: deletedUser.email,
    });
  } catch (err) {
    console.error("Error:", err.message);
    if (err.code === "P2003") {
      console.error("Still blocked by a foreign key - run check-admin-usage.js again to see what's left.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

forceDelete();