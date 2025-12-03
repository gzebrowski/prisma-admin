import * as fs from 'fs';
import * as path from 'path';
import slugify from 'slugify';
import { promisify } from 'util';
import sharp from 'sharp';
import { BaseFileStorage, ThumbnailOptions } from './base-storage';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

/**
 * Local file system storage implementation
 * Stores files on local disk and serves them via static file middleware
 */
export class LocalFileStorage extends BaseFileStorage {
  private uploadDir: string;

  constructor(uploadDir: string, baseUrl: string) {
    super(baseUrl);
    this.uploadDir = uploadDir;
  }

  /**
   * Process and save file to disk
   */
  async processFile(
    file: File | Express.Multer.File,
    extraPath?: string,
  ): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Get file properties - handle both File and Express.Multer.File
    const fileName = 'name' in file ? file.name : file.originalname;
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

    // Generate unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${slugifiedName}-${timestamp}${ext}`;

    // Create model-specific directory path
    const modelDir = path.join(this.uploadDir, extraPath || '');
    const fileKey = path.join(extraPath || '', uniqueFileName);
    const fullPath = path.join(this.uploadDir, fileKey);

    // Ensure directory exists
    await this.ensureDirectoryExists(modelDir);

    // Write file to disk
    await writeFile(fullPath, fileBuffer);

    // Return relative path as file key
    return fileKey;
  }

  /**
   * Get file URL from file key
   */
  composeFinalUrl(fileKey: string | null): string | null {
    if (!fileKey) {
        return null;
        }   
    // Normalize path separators for URL
    const normalizedKey = fileKey.replace(/\\/g, '/').replace(/^\/+/g, '');
    
    // Return URL that will be served by static file middleware
    const baseSuffix = (this.uploadDir) ? (this.uploadDir.replace(/\/+$/g, '') + '/') : '';
    return `${this.baseUrl}` + (`/${baseSuffix}${normalizedKey}`).replace(/\/+/g, '/');
  }
  getFileUrl(fileKey: string | null): string | null {
    if (!fileKey) {
      return null;
    }

    // Normalize path separators for URL
    return this.composeFinalUrl(fileKey);
  }

  /**
   * Delete file from disk
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) {
      return;
    }

    const fullPath = path.join(this.uploadDir, fileKey);

    try {
      await access(fullPath, fs.constants.F_OK);
      await promisify(fs.unlink)(fullPath);
    } catch (error) {
      // File doesn't exist or can't be deleted - ignore
      console.warn(`Could not delete file: ${fullPath}`, error);
    }
  }

  /**
   * Create thumbnail from existing image
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

    const paths = extraPath ? path.join(extraPath, fileKey) : fileKey;
    const fullPath = path.join(this.uploadDir, paths);

    // Check if original file exists
    try {
      await access(fullPath, fs.constants.F_OK);
    } catch {
      throw new Error(`Original file not found: ${paths}`);
    }

    // Read original file
    const imageBuffer = await readFile(fullPath);

    // Parse original filename
    const ext = path.extname(fileKey);
    const nameWithoutExt = path.basename(fileKey, ext);
    const dirName = path.dirname(fileKey);

    // Generate thumbnail filename
    const thumbnailName = `${nameWithoutExt}-thumb-${maxWidth}x${maxHeight}${ext}`;
    const thumbnailKey = path.join(dirName, thumbnailName);
    const thumbnailPath = path.join(this.uploadDir, thumbnailKey);

    // Ensure directory exists
    const thumbnailDir = path.dirname(thumbnailPath);
    await this.ensureDirectoryExists(thumbnailDir);

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

    // Save thumbnail
    await writeFile(thumbnailPath, thumbnailBuffer);

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
    const thumbnailKey = path.join(dirName, thumbnailName);

    return this.getFileUrl(thumbnailKey);
  }

  /**
   * Initialize upload directory
   */
  async initialize(): Promise<void> {
    await this.ensureDirectoryExists(this.uploadDir);
  }

  /**
   * Check if file exists
   */
  async fileExists(fileKey: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, fileKey);
    try {
      await access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath, fs.constants.F_OK);
    } catch {
      // Directory doesn't exist, create it recursively
      await mkdir(dirPath, { recursive: true });
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
}

/**
 * Create LocalFileStorage instance with configuration
 */
export function createLocalFileStorage(
  uploadDir?: string,
  baseUrl?: string,
): LocalFileStorage {
  const dir = uploadDir || process.env.UPLOAD_DIR || 'uploads';
  const url = baseUrl || process.env.NX_PUBLIC_API_URL || 'http://localhost:3001';
  
  return new LocalFileStorage(dir, url);
}
