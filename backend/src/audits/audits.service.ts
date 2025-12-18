import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './schemas/audit.schema';
import { CreateAuditDto } from './dto/create-audit.dto';
import { getCloudinary } from '../attachments/cloudinary.config';

// Helper to generate signed URL for raw files (PDFs)
function generateSignedUrl(cloudinaryId: string): string {
  const cloudinary = getCloudinary();

  // Generate a signed URL that expires in 1 hour (3600 seconds)
  const signedUrl = cloudinary.url(cloudinaryId, {
    resource_type: 'raw',
    type: 'upload',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
  });

  return signedUrl;
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
    const audits = await this.auditModel
      .find({ projectId })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .exec();

    // Replace stored URLs with signed URLs for secure access
    return audits.map((audit) => {
      const auditObj = audit.toObject();
      auditObj.url = generateSignedUrl(audit.cloudinaryId);
      return auditObj as AuditDocument;
    });
  }

  async findOne(id: string): Promise<AuditDocument> {
    const audit = await this.auditModel
      .findById(id)
      .populate('userId', 'firstName lastName avatar')
      .exec();

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Replace stored URL with signed URL for secure access
    const auditObj = audit.toObject();
    auditObj.url = generateSignedUrl(audit.cloudinaryId);
    return auditObj as AuditDocument;
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
