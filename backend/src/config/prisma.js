import pkg from '@prisma/client';
const { PrismaClient } = pkg;

// Prevent multiple instances in development (hot reload creates new instances)
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// In dev, save to global so hot reload reuses the same instance
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const checkConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

export const ensureConnection = async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

export default prisma;
