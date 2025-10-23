import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';
import * as fs from 'fs';
import * as path from 'path';

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
    const attachment = new this.attachmentModel({
      issueId,
      userId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    });

    return (await attachment.save()).populate('userId', 'firstName lastName avatar');
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

  async remove(id: string): Promise<void> {
    const attachment = await this.findOne(id);

    // Delete physical file
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    // Delete from database
    await this.attachmentModel.findByIdAndDelete(id).exec();
  }

  async getFilePath(id: string): Promise<string> {
    const attachment = await this.findOne(id);
    return attachment.path;
  }

  async getTotalSize(issueId: string): Promise<number> {
    const attachments = await this.findByIssue(issueId);
    return attachments.reduce((sum, att) => sum + att.size, 0);
  }
}
