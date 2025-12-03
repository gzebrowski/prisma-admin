/**
 * @prisma-admin/node-utils
 * 
 * Node.js-specific utilities for Prisma Admin
 * - File storage abstractions (local, S3)
 * - Image processing and thumbnail generation
 * - File upload helpers
 */

// Storage abstractions
export {
  BaseFileStorage,
  type ThumbnailOptions,
} from './storage/base-storage';

export {
  LocalFileStorage,
  createLocalFileStorage,
} from './storage/local-storage';

// S3 storage is exported separately to avoid requiring AWS SDK as a hard dependency
// Import from '@prisma-admin/node-utils/s3-storage' when needed
