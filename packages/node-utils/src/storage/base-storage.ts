/**
 * Base interface for file upload results
 */
export interface FileUploadResult {
  fileKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Abstract base class for file storage implementations
 * Provides common interface for both local and cloud storage (S3, etc.)
 */
export abstract class BaseFileStorage {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Process and save file
   * @param file File object from multipart form
   * @param extraPath Optional extra path (e.g., model name like 'users', 'posts')
   * @returns File key (relative path or cloud identifier)
   */
  abstract processFile(
    file: File | Express.Multer.File,
    extraPath?: string,
  ): Promise<string>;

  /**
   * Get file URL from file key
   * @param fileKey File key (relative path or cloud identifier)
   * @returns Full URL to access the file
   */
  abstract getFileUrl(fileKey: string | null): string | null;

  /**
   * Delete file
   * @param fileKey File key (relative path or cloud identifier)
   */
  abstract deleteFile(fileKey: string): Promise<void>;

  /**
   * Create thumbnail from existing image
   * @param fileKey Original file key
   * @param extraPath Optional extra path
   * @param maxWidth Maximum width for thumbnail
   * @param maxHeight Maximum height for thumbnail
   * @param options Additional thumbnail options
   * @returns Thumbnail file key
   */
  abstract createThumbnail(
    fileKey: string,
    extraPath?: string,
    maxWidth?: number,
    maxHeight?: number,
    options?: ThumbnailOptions,
  ): Promise<string>;

  /**
   * Get thumbnail URL
   * @param fileKey Original file key or thumbnail key
   * @param maxWidth Maximum width (if thumbnail key not provided)
   * @param maxHeight Maximum height (if thumbnail key not provided)
   * @returns Thumbnail URL
   */
  abstract getThumbnailUrl(
    fileKey: string | null,
    maxWidth?: number,
    maxHeight?: number,
  ): string | null;

  /**
   * Initialize storage (create directories, verify credentials, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if file exists
   * @param fileKey File key
   */
  abstract fileExists(fileKey: string): Promise<boolean>;
}
