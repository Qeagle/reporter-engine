import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FileUploadService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads/profiles');
    this.ensureUploadsDirectory();
    
    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  fileFilter(req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
      }
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  }

  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `avatar-${timestamp}-${randomString}${ext}`;
  }

  async processProfileImage(buffer, originalName) {
    try {
      const filename = this.generateUniqueFilename(originalName);
      const outputPath = path.join(this.uploadsDir, filename);

      // Process image with sharp
      await sharp(buffer)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toFile(outputPath);

      // Also create a small thumbnail
      const thumbnailFilename = `thumb-${filename}`;
      const thumbnailPath = path.join(this.uploadsDir, thumbnailFilename);

      await sharp(buffer)
        .resize(100, 100, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toFile(thumbnailPath);

      return {
        filename,
        thumbnailFilename,
        path: outputPath,
        thumbnailPath,
        url: `/uploads/profiles/${filename}`,
        thumbnailUrl: `/uploads/profiles/${thumbnailFilename}`,
        size: (await fs.stat(outputPath)).size
      };
    } catch (error) {
      console.error('Error processing profile image:', error);
      throw new Error('Failed to process image');
    }
  }

  async deleteProfileImage(filename) {
    try {
      if (!filename) return;

      const filePath = path.join(this.uploadsDir, filename);
      const thumbnailPath = path.join(this.uploadsDir, `thumb-${filename}`);

      // Delete main image
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Could not delete main image:', error.message);
      }

      // Delete thumbnail
      try {
        await fs.unlink(thumbnailPath);
      } catch (error) {
        console.warn('Could not delete thumbnail:', error.message);
      }

      return true;
    } catch (error) {
      console.error('Error deleting profile image:', error);
      return false;
    }
  }

  // Get multer middleware for single file upload
  getSingleUploadMiddleware(fieldName = 'avatar') {
    return this.upload.single(fieldName);
  }

  // Validate uploaded file
  validateUploadedFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file uploaded');
      return errors;
    }

    // Check file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      errors.push('File size must be less than 5MB');
    }

    // Check file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
    }

    return errors;
  }

  // Get file info
  async getFileInfo(filename) {
    try {
      const filePath = path.join(this.uploadsDir, filename);
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/profiles/${filename}`
      };
    } catch (error) {
      return null;
    }
  }

  // Clean up old orphaned files (files not referenced in database)
  async cleanupOrphanedFiles(referencedFiles = []) {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const orphanedFiles = files.filter(file => 
        !referencedFiles.includes(file) && 
        !file.startsWith('thumb-') // Keep thumbnails of referenced files
      );

      let deletedCount = 0;
      for (const file of orphanedFiles) {
        try {
          await fs.unlink(path.join(this.uploadsDir, file));
          deletedCount++;
        } catch (error) {
          console.warn(`Could not delete orphaned file ${file}:`, error.message);
        }
      }

      return {
        total: files.length,
        orphaned: orphanedFiles.length,
        deleted: deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      return null;
    }
  }
}

export default FileUploadService;
