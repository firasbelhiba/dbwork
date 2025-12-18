import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './schemas/audit.schema';
import { CreateAuditDto } from './dto/create-audit.dto';
import { getCloudinary } from '../attachments/cloudinary.config';

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
      const cloudinary = getCloudinary();

      // Upload to Cloudinary
      // Ensure .pdf extension is preserved in the public_id for proper serving
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const publicId = sanitizedFilename.toLowerCase().endsWith('.pdf')
        ? `${Date.now()}-${sanitizedFilename}`
        : `${Date.now()}-${sanitizedFilename}.pdf`;

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `dbwork/audits/${projectId}`,
            resource_type: 'raw',
            public_id: publicId,
            // Enable public access for the file
            access_mode: 'public',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file.buffer);
      });

      const audit = new this.auditModel({
        projectId,
        userId,
        title: createAuditDto.title,
        auditType: createAuditDto.auditType,
        description: createAuditDto.description,
        filename: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: result.secure_url,
        cloudinaryId: result.public_id,
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
    const audit = await this.findOne(id);
    const cloudinary = getCloudinary();

    try {
      // Delete from Cloudinary (PDF uses 'raw' resource type)
      await cloudinary.uploader.destroy(audit.cloudinaryId, {
        resource_type: 'raw',
      });
    } catch (error) {
      console.error('Failed to delete audit from Cloudinary:', error);
    }

    // Delete from database
    await this.auditModel.findByIdAndDelete(id).exec();
  }
}
