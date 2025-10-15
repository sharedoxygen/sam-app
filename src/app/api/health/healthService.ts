import { PrismaClient } from '@prisma/client';

export async function checkHealth(prisma?: PrismaClient) {
  const client = prisma || new PrismaClient();

  try {
    await client.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (!prisma) {
      // Only disconnect if we created the client locally
      await client.$disconnect();
    }
  }
}
