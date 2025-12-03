// Export core functionality
export * from '../../core/src';

// Export Express specific services and router
export { BaseAdminService } from './admin.service';
export { PrismaService } from './prisma.service';
export { AdminRouter, createAdminRouter } from './admin.router';

// Re-export commonly used types for convenience
export type {
    CommonReturnModelItemType,
    CommonPostResult,
    FieldDefinition,
    InlineDefinition,
    ExistingFormData,
    NewFormData
} from '../../core/src';
