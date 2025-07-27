import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { requireAuth } from "./simpleAuth";
import type { Express } from "express";

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Utility function to get image dimensions
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  // Simple implementation - in production, you might want to use a library like 'sharp'
  return { width: 0, height: 0 }; // Placeholder
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const ext = path.extname(originalName);
  return `${timestamp}-${random}${ext}`;
}

export function setupMediaRoutes(app: Express) {
  // Upload single image
  app.post('/api/media/upload', requireAuth, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = generateFilename(req.file.originalname);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'media');
      
      // Ensure upload directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, filename);
      
      // Save file to disk
      await fs.writeFile(filePath, req.file.buffer);
      
      // Get image dimensions (placeholder implementation)
      const dimensions = await getImageDimensions(req.file.buffer);
      
      // Save to database
      const mediaAsset = await storage.createMediaAsset({
        filename,
        originalFilename: req.file.originalname,
        filePath: `/uploads/media/${filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        width: dimensions.width,
        height: dimensions.height,
        altText: req.body.altText || '',
        uploadedBy: req.userId,
      });

      res.json({
        id: mediaAsset.id,
        filename: mediaAsset.filename,
        originalFilename: mediaAsset.originalFilename,
        url: mediaAsset.filePath,
        size: mediaAsset.fileSize,
        mimeType: mediaAsset.mimeType,
        altText: mediaAsset.altText,
        createdAt: mediaAsset.createdAt,
      });
    } catch (error) {
      console.error('Media upload error:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });

  // Get all media assets
  app.get('/api/media', requireAuth, async (req: any, res) => {
    try {
      const assets = await storage.getMediaAssets();
      res.json(assets);
    } catch (error) {
      console.error('Error fetching media:', error);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  });

  // Delete media asset
  app.delete('/api/media/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getMediaAsset(id);
      
      if (!asset) {
        return res.status(404).json({ error: 'Media asset not found' });
      }

      // Delete file from disk
      const fullPath = path.join(process.cwd(), asset.filePath.replace(/^\//, ''));
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        console.warn('Failed to delete file from disk:', error);
      }

      // Delete from database
      await storage.deleteMediaAsset(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting media:', error);
      res.status(500).json({ error: 'Failed to delete media' });
    }
  });

  // Serve uploaded media files
  app.use('/uploads/media', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', 'media', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: 'File not found' });
      }
    });
  });
}