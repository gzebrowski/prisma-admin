// Export core functionality
export * from '../../core/src';

// Export NestJS specific services and controllers
export { BaseAdminController } from './admin.controller';
export { BaseAdminService } from './admin.service';
export { PrismaService } from './prisma.service';

// Re-export commonly used types for convenience
export type {
  CommonReturnModelItemType,
  CommonPostResult,
  FieldDefinition,
  InlineDefinition,
  ExistingFormData,
  NewFormData
} from '../../core/src';