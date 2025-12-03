import { PrismaClient } from '@prisma/client';

/**
 * Prisma service wrapper for Fastify applications
 * Provides database connection management
 */
export class PrismaService extends PrismaClient {
  private static instance: PrismaService;

  constructor() {
    super();
  }

  /**
   * Get singleton instance of PrismaService
   */
  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  /**
   * Connect to database
   */
  async connect() {
    await this.$connect();
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.$disconnect();
  }
}
