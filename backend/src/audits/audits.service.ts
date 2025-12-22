import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './schemas/audit.schema';
import { CreateAuditDto } from './dto/create-audit.dto';
import * as fs from 'fs';
import * as path from 'path';

// Directory for storing audit PDFs
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'audits');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Injectable()
export class AuditsService {
  constructor(
    @InjectModel(Audit.name)
    private auditModel: Model<AuditDocument>,
  ) {}

  async create(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
    createAuditDto: CreateAuditDto,
  ): Promise<AuditDocument> {
    // Validate PDF file type
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    try {
      // Create project-specific directory
      const projectDir = path.join(UPLOADS_DIR, projectId);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Generate unique filename
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}-${sanitizedFilename}`;
      const filepath = path.join(projectDir, filename);

      // Save file to disk
      fs.writeFileSync(filepath, file.buffer);

      // Create audit record (url field will be used by the view endpoint)
      const audit = new this.auditModel({
        projectId,
        userId,
        title: createAuditDto.title,
        auditType: createAuditDto.auditType,
        description: createAuditDto.description,
        filename: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: filepath, // Store local path
        cloudinaryId: null, // Not using Cloudinary anymore
        auditDate: createAuditDto.auditDate
          ? new Date(createAuditDto.auditDate)
          : undefined,
      });

      return (await audit.save()).populate('userId', 'firstName lastName avatar');
    } catch (error) {
      throw new BadRequestException(`Failed to upload audit: ${error.message}`);
    }
  }

  async findByProject(projectId: string): Promise<AuditDocument[]> {
    return this.auditModel
      .find({ projectId })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AuditDocument> {
    const audit = await this.auditModel
      .findById(id)
      .populate('userId', 'firstName lastName avatar')
      .exec();

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Return audit with proxy URL for viewing
    const auditObj = audit.toObject();
    // URL will be set by frontend to use the proxy endpoint
    return auditObj as AuditDocument;
  }

  // Returns audit with original Cloudinary URL (for backend use only)
  async findOneRaw(id: string): Promise<AuditDocument> {
    const audit = await this.auditModel.findById(id).exec();

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    return audit;
  }

  async remove(id: string): Promise<void> {
    const audit = await this.findOneRaw(id);

    try {
      // Resolve the file path - handle paths from different environments
      let filePath = audit.url;

      if (!fs.existsSync(filePath)) {
        // Extract the relative path portion (uploads/audits/projectId/filename)
        const uploadsIndex = audit.url?.indexOf('uploads/audits');
        if (uploadsIndex !== -1) {
          const relativePath = audit.url.substring(uploadsIndex);
          filePath = path.join(process.cwd(), relativePath);
        }
      }

      // Delete local file if it exists
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete audit file from disk:', error);
    }

    // Delete from database
    await this.auditModel.findByIdAndDelete(id).exec();
  }
}
