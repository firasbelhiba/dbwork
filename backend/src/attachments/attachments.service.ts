import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';
import { getCloudinary } from './cloudinary.config';

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
      const cloudinary = getCloudinary();

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `dbwork/attachments/${issueId}`,
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file.buffer);
      });

      // Generate thumbnail URL for images
      let thumbnail = null;
      if (file.mimetype.startsWith('image/')) {
        thumbnail = cloudinary.url(result.public_id, {
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
          secure: true,
        });
      }

      const attachment = new this.attachmentModel({
        issueId,
        userId,
        filename: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: result.secure_url,
        cloudinaryId: result.public_id,
        thumbnail,
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

  async remove(id: string): Promise<void> {
    const attachment = await this.findOne(id);
    const cloudinary = getCloudinary();

    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(attachment.cloudinaryId, {
        resource_type: 'raw',
      });
    } catch (error) {
      // Try with 'image' resource type if 'raw' fails
      try {
        await cloudinary.uploader.destroy(attachment.cloudinaryId, {
          resource_type: 'image',
        });
      } catch {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }

    // Delete from database
    await this.attachmentModel.findByIdAndDelete(id).exec();
  }

  async getTotalSize(issueId: string): Promise<number> {
    const attachments = await this.findByIssue(issueId);
    return attachments.reduce((sum, att) => sum + att.size, 0);
  }
}
