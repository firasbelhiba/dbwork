import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';
import * as fs from 'fs';
import * as path from 'path';

// Directory for storing attachments
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'attachments');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectModel(Attachment.name)
    private attachmentModel: Model<AttachmentDocument>,
  ) {}

  async create(
    issueId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<AttachmentDocument> {
    try {
      // Create issue-specific directory
      const issueDir = path.join(UPLOADS_DIR, issueId);
      if (!fs.existsSync(issueDir)) {
        fs.mkdirSync(issueDir, { recursive: true });
      }

      // Generate unique filename
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}-${sanitizedFilename}`;
      const filepath = path.join(issueDir, filename);

      // Save file to disk
      fs.writeFileSync(filepath, file.buffer);

      const attachment = new this.attachmentModel({
        issueId,
        userId,
        filename: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: filepath, // Store local path
        cloudinaryId: null, // Not using Cloudinary anymore
        thumbnail: null, // No thumbnail for local storage
      });

      return (await attachment.save()).populate('userId', 'firstName lastName avatar');
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async findByIssue(issueId: string): Promise<AttachmentDocument[]> {
    return this.attachmentModel
      .find({ issueId })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AttachmentDocument> {
    const attachment = await this.attachmentModel
      .findById(id)
      .populate('userId', 'firstName lastName avatar')
      .exec();

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  // Returns attachment with original path (for backend use only)
  async findOneRaw(id: string): Promise<AttachmentDocument> {
    const attachment = await this.attachmentModel.findById(id).exec();

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.findOneRaw(id);

    try {
      // Delete local file if it exists
      if (attachment.url && fs.existsSync(attachment.url)) {
        fs.unlinkSync(attachment.url);
      }
    } catch (error) {
      console.error('Failed to delete attachment file from disk:', error);
    }

    // Delete from database
    await this.attachmentModel.findByIdAndDelete(id).exec();
  }

  async getTotalSize(issueId: string): Promise<number> {
    const attachments = await this.findByIssue(issueId);
    return attachments.reduce((sum, att) => sum + att.size, 0);
  }
}
