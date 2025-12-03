import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import slugify from 'slugify';
import sharp from 'sharp';
import * as path from 'path';
import { BaseFileStorage, ThumbnailOptions } from './base-storage';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For S3-compatible services
  forcePathStyle?: boolean; // For MinIO/LocalStack
}

/**
 * AWS S3 storage implementation
 * Stores files in S3 bucket with optional signed URLs
 */
export class S3FileStorage extends BaseFileStorage {
  private s3Client: S3Client;
  private bucket: string;
  private urlExpirationSeconds: number;

  constructor(
    config: S3Config,
    baseUrl: string,
    urlExpirationSeconds: number = 3600,
  ) {
    super(baseUrl);
    this.bucket = config.bucket;
    this.urlExpirationSeconds = urlExpirationSeconds;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: config.region,
      credentials: config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
    });
  }

  /**
   * Process and upload file to S3
   */
  async processFile(
    file: File | Express.Multer.File,
    extraPath?: string,
  ): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Get file properties
    const fileName = 'name' in file ? file.name : file.originalname;
    const contentType = 'type' in file ? file.type : file.mimetype;
    const fileBuffer = await this.getFileBuffer(file);

    // Extract file extension
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);

    // Slugify the filename
    const slugifiedName = slugify(nameWithoutExt, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${slugifiedName}-${timestamp}${ext}`;

    // Create S3 key with optional path prefix
    const fileKey = extraPath
      ? `${extraPath}/${uniqueFileName}`
      : uniqueFileName;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return fileKey;
  }

  /**
   * Get file URL (signed URL or public URL)
   */
  getFileUrl(fileKey: string | null): string | null {
    if (!fileKey) {
      return null;
    }

    // If baseUrl is configured as CloudFront or public bucket URL, use it
    if (this.baseUrl && !this.baseUrl.includes('s3.amazonaws.com')) {
      const normalizedKey = fileKey.replace(/\\/g, '/');
      return `${this.baseUrl}/${normalizedKey}`;
    }

    // Otherwise, return S3 direct URL (will need presigning for private buckets)
    return `https://${this.bucket}.s3.amazonaws.com/${fileKey}`;
  }

  /**
   * Get signed URL for private S3 objects
   */
  async getSignedFileUrl(
    fileKey: string,
    expiresIn?: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    return await getSignedUrl(
      this.s3Client,
      command,
      { expiresIn: expiresIn || this.urlExpirationSeconds },
    );
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) {
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.warn(`Could not delete S3 object: ${fileKey}`, error);
    }
  }

  /**
   * Create thumbnail from existing S3 image
   */
  async createThumbnail(
    fileKey: string,
    extraPath?: string,
    maxWidth: number = 300,
    maxHeight: number = 300,
    options?: ThumbnailOptions,
  ): Promise<string> {
    if (!fileKey) {
      throw new Error('No file key provided');
    }

    // Check if original file exists
    const exists = await this.fileExists(fileKey);
    if (!exists) {
      throw new Error(`Original file not found: ${fileKey}`);
    }

    // Download original image from S3
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    const response = await this.s3Client.send(getCommand);
    const imageBuffer = await this.streamToBuffer(response.Body as any);

    // Parse original filename
    const ext = path.extname(fileKey);
    const nameWithoutExt = path.basename(fileKey, ext);
    const dirName = path.dirname(fileKey);

    // Generate thumbnail filename
    const thumbnailName = `${nameWithoutExt}-thumb-${maxWidth}x${maxHeight}${ext}`;
    const thumbnailKey = dirName !== '.'
      ? `${dirName}/${thumbnailName}`
      : thumbnailName;

    // Create thumbnail using sharp
    const format = options?.format || 'jpeg';
    const quality = options?.quality || 80;

    let sharpInstance = sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Apply format-specific options
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
    }

    const thumbnailBuffer = await sharpInstance.toBuffer();

    // Determine content type
    const contentType = this.getContentType(format);

    // Upload thumbnail to S3
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: contentType,
    });

    await this.s3Client.send(putCommand);

    return thumbnailKey;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(
    fileKey: string | null,
    maxWidth: number = 300,
    maxHeight: number = 300,
  ): string | null {
    if (!fileKey) {
      return null;
    }

    // Check if this is already a thumbnail key
    if (fileKey.includes('-thumb-')) {
      return this.getFileUrl(fileKey);
    }

    // Generate thumbnail key
    const ext = path.extname(fileKey);
    const nameWithoutExt = path.basename(fileKey, ext);
    const dirName = path.dirname(fileKey);
    const thumbnailName = `${nameWithoutExt}-thumb-${maxWidth}x${maxHeight}${ext}`;
    const thumbnailKey = dirName !== '.'
      ? `${dirName}/${thumbnailName}`
      : thumbnailName;

    return this.getFileUrl(thumbnailKey);
  }

  /**
   * Get signed thumbnail URL for private buckets
   */
  async getSignedThumbnailUrl(
    fileKey: string,
    maxWidth: number = 300,
    maxHeight: number = 300,
    expiresIn?: number,
  ): Promise<string> {
    // Check if this is already a thumbnail key
    if (fileKey.includes('-thumb-')) {
      return this.getSignedFileUrl(fileKey, expiresIn);
    }

    // Generate thumbnail key
    const ext = path.extname(fileKey);
    const nameWithoutExt = path.basename(fileKey, ext);
    const dirName = path.dirname(fileKey);
    const thumbnailName = `${nameWithoutExt}-thumb-${maxWidth}x${maxHeight}${ext}`;
    const thumbnailKey = dirName !== '.'
      ? `${dirName}/${thumbnailName}`
      : thumbnailName;

    return this.getSignedFileUrl(thumbnailKey, expiresIn);
  }

  /**
   * Initialize S3 bucket (verify access)
   */
  async initialize(): Promise<void> {
    // Test bucket access by listing objects
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: '.health-check',
      });
      await this.s3Client.send(command);
    } catch (error: any) {
      // 404 is fine - bucket exists but object doesn't
      if (error.name !== 'NotFound') {
        console.warn('S3 bucket access test failed:', error);
      }
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get buffer from file object
   */
  private async getFileBuffer(file: File | Express.Multer.File): Promise<Buffer> {
    if ('buffer' in file) {
      // Express.Multer.File
      return file.buffer;
    } else if ('arrayBuffer' in file) {
      // Web File API
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      throw new Error('Unsupported file type');
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Get content type from format
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }
}

/**
 * Create S3FileStorage instance with configuration
 */
export function createS3FileStorage(
  config?: Partial<S3Config>,
  baseUrl?: string,
  urlExpirationSeconds?: number,
): S3FileStorage {
  const s3Config: S3Config = {
    region: config?.region || process.env.AWS_REGION || 'us-east-1',
    bucket: config?.bucket || process.env.AWS_S3_BUCKET || '',
    accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: config?.endpoint || process.env.AWS_S3_ENDPOINT,
    forcePathStyle: config?.forcePathStyle || process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  };

  if (!s3Config.bucket) {
    throw new Error('S3 bucket is required. Set AWS_S3_BUCKET environment variable or pass bucket in config');
  }

  const url = baseUrl || process.env.AWS_CLOUDFRONT_URL || process.env.AWS_S3_PUBLIC_URL || '';
  const expiration = urlExpirationSeconds || parseInt(process.env.AWS_S3_URL_EXPIRATION || '3600', 10);

  return new S3FileStorage(s3Config, url, expiration);
}
