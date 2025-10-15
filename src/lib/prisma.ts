import { PrismaClient } from '@prisma/client';

// Create a properly typed global instance of PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;

  // Add connection cleanup in development to prevent pool exhaustion
  if (typeof window === 'undefined') {
    process.on('SIGINT', async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
}

// 🔒 IMMUTABLE ADMIN USER PROTECTION
// Middleware to prevent deletion or username changes of the system admin user
prisma.$use(async (params, next) => {
  // Protect admin user from deletion
  if (params.model === 'User' && params.action === 'delete') {
    const where = params.args.where;
    if (where.username === 'admin' || where.id) {
      // Check if trying to delete admin
      const user = await prisma.user.findUnique({ where });
      if (user && user.username === 'admin') {
        throw new Error('🔒 FORBIDDEN: System administrator account cannot be deleted');
      }
    }
  }

  // Protect admin user from deactivation or username changes
  if (params.model === 'User' && (params.action === 'update' || params.action === 'updateMany')) {
    const where = params.args.where;
    const data = params.args.data;
    
    // Check if trying to modify admin
    if (where.username === 'admin' || where.id) {
      const user = await prisma.user.findUnique({ where });
      if (user && user.username === 'admin') {
        // Prevent username changes
        if (data.username && data.username !== 'admin') {
          throw new Error('🔒 FORBIDDEN: System administrator username cannot be changed');
        }
        // Prevent role changes
        if (data.role && data.role !== 'ADMIN') {
          throw new Error('🔒 FORBIDDEN: System administrator role cannot be changed');
        }
      }
    }
  }

  return next(params);
});

export default prisma;
