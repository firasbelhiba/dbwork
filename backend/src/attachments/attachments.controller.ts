import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('issue/:issueId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Allow most common file types
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip',
          'application/x-zip-compressed',
          'text/csv',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload attachment to issue (stored on Cloudinary)' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded successfully' })
  create(
    @Param('issueId') issueId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.attachmentsService.create(issueId, user._id, file);
  }

  @Get('issue/:issueId')
  @ApiOperation({ summary: 'Get all attachments for an issue' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  findByIssue(@Param('issueId') issueId: string) {
    return this.attachmentsService.findByIssue(issueId);
  }

  @Get('issue/:issueId/size')
  @ApiOperation({ summary: 'Get total attachment size for an issue' })
  @ApiResponse({ status: 200, description: 'Total size in bytes' })
  getTotalSize(@Param('issueId') issueId: string) {
    return this.attachmentsService.getTotalSize(issueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment metadata' })
  @ApiResponse({ status: 200, description: 'Attachment information' })
  findOne(@Param('id') id: string) {
    return this.attachmentsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
