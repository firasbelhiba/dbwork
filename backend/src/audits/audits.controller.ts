import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { memoryStorage } from 'multer';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post('projects/:projectId/audits')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          callback(null, true);
        }
      },
    }),
  )
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() createAuditDto: CreateAuditDto,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    return this.auditsService.create(projectId, user._id, file, createAuditDto);
  }

  @Get('projects/:projectId/audits')
  async findByProject(@Param('projectId') projectId: string) {
    return this.auditsService.findByProject(projectId);
  }

  @Get('audits/:id')
  async findOne(@Param('id') id: string) {
    return this.auditsService.findOne(id);
  }

  @Get('audits/:id/view')
  async viewPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      const audit = await this.auditsService.findOneRaw(id);

      // Fetch the PDF from Cloudinary
      const response = await fetch(audit.url);

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch PDF from storage',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Get the PDF content as buffer
      const buffer = await response.arrayBuffer();

      // Set proper headers for inline PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${audit.originalName}"`,
      );
      res.setHeader('Content-Length', buffer.byteLength);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      // Send the PDF buffer
      res.send(Buffer.from(buffer));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to load PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('audits/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const audit = await this.auditsService.findOne(id);

    // Only allow uploader or admin to delete
    const uploaderId =
      typeof audit.userId === 'object' && (audit.userId as any)._id
        ? (audit.userId as any)._id.toString()
        : audit.userId.toString();

    if (uploaderId !== user._id.toString() && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own audits');
    }

    await this.auditsService.remove(id);
    return { message: 'Audit deleted successfully' };
  }
}
