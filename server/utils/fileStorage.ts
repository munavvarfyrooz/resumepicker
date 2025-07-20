import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export interface FileUploadResult {
  filePath: string;
  fileName: string;
  fileType: string;
}

export class FileStorage {
  private static uploadDir = process.env.UPLOAD_DIR || 'uploads';

  static async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<FileUploadResult> {
    // Ensure upload directory exists
    await this.ensureUploadDir();

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(originalName);
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, fileBuffer);

    // Determine file type
    const fileType = this.getFileType(originalName, mimeType);

    return {
      filePath,
      fileName: originalName,
      fileType,
    };
  }

  private static async ensureUploadDir(): Promise<void> {
    try {
      await mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private static sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }

  private static getFileType(fileName: string, mimeType: string): string {
    const extension = path.extname(fileName).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        return 'pdf';
      case '.docx':
        return 'docx';
      case '.doc':
        return 'docx';
      case '.txt':
        return 'txt';
      default:
        // Try to determine from MIME type
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
        if (mimeType.includes('text')) return 'txt';
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  static getFilePath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }

  static fileExists(fileName: string): boolean {
    const filePath = this.getFilePath(fileName);
    return fs.existsSync(filePath);
  }
}
