import { PrismaClient } from '@prisma/client';

/**
 * Prisma service wrapper for AdonisJS applications
 * Can be registered as a singleton service in AdonisJS IoC container
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

  /**
   * Boot method for AdonisJS service provider
   */
  async boot() {
    await this.connect();
  }

  /**
   * Shutdown method for AdonisJS service provider
   */
  async shutdown() {
    await this.disconnect();
  }
}
