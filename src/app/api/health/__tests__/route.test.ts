import { checkHealth } from '../healthService';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

describe('Health Service', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  it('should return healthy status when database is connected', async () => {
    // Mock successful database connection
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const result = await checkHealth(mockPrisma);

    expect(result.status).toBe('healthy');
    expect(result.services).toEqual({
      database: 'connected',
    });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('should return unhealthy status when database connection fails', async () => {
    // Mock database connection failure
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection failed'));

    const result = await checkHealth(mockPrisma);

    expect(result.status).toBe('unhealthy');
    expect(result.error).toBe('Database connection failed');
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
