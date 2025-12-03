/**
 * S3 Storage Module
 * 
 * Requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to be installed
 * Install with: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 
 * Import from: '@prisma-admin/node-utils/s3-storage'
 */

export {
  S3FileStorage,
  createS3FileStorage,
  type S3Config,
} from './storage/s3-storage';
