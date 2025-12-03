# @prisma-admin/node-utils

Node.js-specific utilities for Prisma Admin, providing file storage abstractions, image processing, and thumbnail generation.

## Features

- **File Storage Abstractions**: Unified interface for different storage backends
- **Local File Storage**: Store files on local filesystem
- **AWS S3 Storage**: Store files in S3-compatible object storage
- **Image Processing**: Automatic thumbnail generation with Sharp
- **TypeScript Support**: Full type definitions included
- **Framework Agnostic**: Works with any Node.js application

## Installation

```bash
npm install @prisma-admin/node-utils
```

For S3 storage support, install AWS SDK:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Usage

### Local File Storage

```typescript
import { LocalFileStorage, createLocalFileStorage } from '@prisma-admin/node-utils';

// Create instance with factory function
const storage = createLocalFileStorage(
  './uploads',           // Upload directory (default: 'uploads')
  'http://localhost:3001' // Base URL (default: process.env.NX_PUBLIC_API_URL)
);

// Or create instance directly
const storage = new LocalFileStorage('./uploads', 'http://localhost:3001');

// Initialize storage (creates upload directory)
await storage.initialize();

// Upload a file
const fileKey = await storage.processFile(file, 'blog-posts');
// Returns: 'blog-posts/my-image-1701453123456.jpg'

// Get file URL
const url = storage.getFileUrl(fileKey);
// Returns: 'http://localhost:3001/uploads/blog-posts/my-image-1701453123456.jpg'

// Create thumbnail
const thumbnailKey = await storage.createThumbnail(
  fileKey,
  undefined,  // extraPath (optional)
  300,        // maxWidth (default: 300)
  300,        // maxHeight (default: 300)
  {
    format: 'jpeg',  // 'jpeg' | 'png' | 'webp'
    quality: 80      // 1-100
  }
);

// Get thumbnail URL
const thumbnailUrl = storage.getThumbnailUrl(fileKey, 300, 300);

// Delete file
await storage.deleteFile(fileKey);

// Check if file exists
const exists = await storage.fileExists(fileKey);
```

### AWS S3 Storage

```typescript
import { S3FileStorage, createS3FileStorage } from '@prisma-admin/node-utils/s3-storage';

// Create instance with factory function (uses environment variables)
const storage = createS3FileStorage();

// Or with custom configuration
const storage = createS3FileStorage(
  {
    region: 'us-east-1',
    bucket: 'my-bucket',
    accessKeyId: 'AKIA...',          // Optional if using IAM roles
    secretAccessKey: 'secret...',    // Optional if using IAM roles
    endpoint: 'https://...',         // Optional for S3-compatible services
    forcePathStyle: false            // Optional for MinIO/LocalStack
  },
  'https://cdn.example.com',  // Base URL (CloudFront URL or S3 public URL)
  3600                        // URL expiration in seconds (default: 3600)
);

// Initialize (test bucket access)
await storage.initialize();

// Upload a file
const fileKey = await storage.processFile(file, 'blog-posts');

// Get public URL
const url = storage.getFileUrl(fileKey);

// Get signed URL (for private buckets)
const signedUrl = await storage.getSignedFileUrl(fileKey, 7200); // Expires in 2 hours

// Create thumbnail (downloads from S3, creates thumbnail, uploads back)
const thumbnailKey = await storage.createThumbnail(fileKey, undefined, 300, 300, {
  format: 'webp',
  quality: 85
});

// Get signed thumbnail URL
const signedThumbnailUrl = await storage.getSignedThumbnailUrl(fileKey, 300, 300);

// Delete file
await storage.deleteFile(fileKey);
```

### Using with NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { LocalFileStorage } from '@prisma-admin/node-utils';

@Injectable()
export class FileService {
  private storage: LocalFileStorage;

  constructor() {
    this.storage = new LocalFileStorage(
      process.env.UPLOAD_DIR || './uploads',
      process.env.API_URL || 'http://localhost:3001'
    );
  }

  async onModuleInit() {
    await this.storage.initialize();
  }

  async uploadFile(file: Express.Multer.File, path?: string) {
    const fileKey = await this.storage.processFile(file, path);
    return {
      key: fileKey,
      url: this.storage.getFileUrl(fileKey),
    };
  }

  async uploadWithThumbnail(file: Express.Multer.File, path?: string) {
    const fileKey = await this.storage.processFile(file, path);
    const thumbnailKey = await this.storage.createThumbnail(fileKey);
    
    return {
      key: fileKey,
      url: this.storage.getFileUrl(fileKey),
      thumbnail: {
        key: thumbnailKey,
        url: this.storage.getFileUrl(thumbnailKey),
      },
    };
  }

  async deleteFile(fileKey: string) {
    await this.storage.deleteFile(fileKey);
  }
}
```

## Environment Variables

### Local Storage

- `UPLOAD_DIR`: Upload directory path (default: `'uploads'`)
- `NX_PUBLIC_API_URL`: Base URL for file URLs (default: `'http://localhost:3001'`)

### S3 Storage

- `AWS_REGION`: AWS region (default: `'us-east-1'`)
- `AWS_S3_BUCKET`: S3 bucket name (required)
- `AWS_ACCESS_KEY_ID`: AWS access key (optional if using IAM roles)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key (optional if using IAM roles)
- `AWS_S3_ENDPOINT`: Custom endpoint for S3-compatible services (optional)
- `AWS_S3_FORCE_PATH_STYLE`: Use path-style URLs (set to `'true'` for MinIO/LocalStack)
- `AWS_CLOUDFRONT_URL`: CloudFront distribution URL (optional)
- `AWS_S3_PUBLIC_URL`: Public S3 bucket URL (optional)
- `AWS_S3_URL_EXPIRATION`: Signed URL expiration in seconds (default: `'3600'`)

## API Reference

### BaseFileStorage (Abstract Class)

All storage implementations extend this base class:

```typescript
abstract class BaseFileStorage {
  constructor(baseUrl: string);
  
  abstract processFile(
    file: File | Express.Multer.File,
    extraPath?: string
  ): Promise<string>;
  
  abstract getFileUrl(fileKey: string | null): string | null;
  
  abstract deleteFile(fileKey: string): Promise<void>;
  
  abstract createThumbnail(
    fileKey: string,
    extraPath?: string,
    maxWidth?: number,
    maxHeight?: number,
    options?: ThumbnailOptions
  ): Promise<string>;
  
  abstract getThumbnailUrl(
    fileKey: string | null,
    maxWidth?: number,
    maxHeight?: number
  ): string | null;
  
  abstract initialize(): Promise<void>;
  
  abstract fileExists(fileKey: string): Promise<boolean>;
}
```

### ThumbnailOptions

```typescript
interface ThumbnailOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 1-100
}
```

### S3Config

```typescript
interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}
```

## File Processing

The storage implementations handle both Web File API and Express.Multer.File:

- **Filename Sanitization**: Uses `slugify` to create safe filenames
- **Unique Filenames**: Adds timestamp to prevent conflicts
- **Path Organization**: Supports organizing files in subdirectories via `extraPath`
- **Image Processing**: Automatic thumbnail generation with Sharp library

## Thumbnail Generation

- **Aspect Ratio Preservation**: Thumbnails maintain original aspect ratio
- **No Enlargement**: Images smaller than target size are not upscaled
- **Multiple Formats**: Support for JPEG, PNG, and WebP
- **Quality Control**: Configurable compression quality (1-100)
- **Automatic Naming**: Thumbnails use consistent naming pattern: `{original}-thumb-{width}x{height}.{ext}`

## License

MIT

## Contributing

Contributions welcome! Please check the main [prisma-admin](https://github.com/your-username/prisma-admin) repository.
