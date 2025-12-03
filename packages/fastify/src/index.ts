// Export core functionality
export * from '../../core/src';

// Export Fastify specific services and plugin
export { BaseAdminService } from './admin.service';
export { PrismaService } from './prisma.service';
export { adminPlugin, AdminPluginOptions } from './admin.plugin';
export { default } from './admin.plugin';

// Re-export commonly used types for convenience
export type {
    CommonReturnModelItemType,
    CommonPostResult,
    FieldDefinition,
    InlineDefinition,
    ExistingFormData,
    NewFormData
} from '../../core/src';
