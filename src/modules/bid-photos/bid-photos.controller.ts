import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
  ParseIntPipe,
  Req,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ValidationPipe,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../guards/auth.guard';
import { BidPhotosService } from './bid-photos.service';
import { ValidateTaskItemPipe } from './pipes/validate-task-item.pipe';
import type { DeletePhotosDto, TaskItemType, UploadPhotosDto } from './types';
import { MovePhotosDto } from './types';
import { archivePhotos } from './types';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { PhotoType } from '@prisma/client';

@Controller('bid-photos')
@UseGuards(AuthGuard)
export class BidPhotosController {
  constructor(
    private readonly bidPhotosService: BidPhotosService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  @Get(':orderId')
  async getPhotos(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException(
        'User must be authenticated with a valid tenant',
      );
    }

    return this.bidPhotosService.getPhotos(tenantId, orderId);
  }

  @Get(':id/download')
  async downloadSinglePhoto(
    @Param('id', ParseIntPipe) photoId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    try {
      const { stream, contentType, filename, contentLength } =
        await this.bidPhotosService.getSinglePhotoStream(photoId, tenantId);

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(contentLength && { 'Content-Length': contentLength.toString() }),
      });

      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).json({ message: 'Stream error' });
        res.end();
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Download error:', error);
        res.status(500).json({
          message: error.message || 'Failed to download photo',
        });
      }
    }
  }

  @Post('download')
  async downloadPhotos(
    @Body() body: archivePhotos,
    @Res() res: Response, // Express Response type
    @Req() req: Request,
  ) {
    try {
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos-${Date.now()}.zip"`,
        'Transfer-Encoding': 'chunked',
      });

      await this.bidPhotosService.streamPhotoZip(body.photoIds, tenantId, res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Failed to download photos',
          error: error.message,
        });
      } else {
        res.end();
      }
    }
  }

  @Post(':orderId')
  @UseInterceptors(FilesInterceptor('photos', 50))
  async uploadPhotos(
    @Param('orderId', ParseIntPipe) orderId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('taskItem') taskItem: TaskItemType,
    @Body('taskItemId', new ParseIntPipe({ optional: true })) taskItemId: number,
    @Body('metadata', new ValidationPipe({ transform: true }))
    metadata: string | string[],
    @Body('photoType') photoTypeInput: string,
    @Req() req: Request,
  ) {
    try {
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      if (!taskItem) {
        throw new BadRequestException('taskItem is required');
      }

       let photoType: PhotoType;
        if (photoTypeInput === 'PROGRESS') {
            photoType = PhotoType.PROGRESS;
        } else {
            photoType = PhotoType.BID; // default
        }

 

      return await this.bidPhotosService.uploadPhotos(
        tenantId,
        orderId,
        files,
        taskItem,
        taskItemId,
        Array.isArray(metadata) ? metadata : [metadata],
        photoType ?? PhotoType.BID,
      );
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Failed to upload photos',
      );
    }
  }

  // Public endpoint
  @Get('worker/:orderId')
  async getPhotosForWorker(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: Request,
  ) {
    try {
      // Extract tenantId from the authenticated user
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      return await this.bidPhotosService.getPhotos(tenantId, orderId);
    } catch (error) {
      console.error('Error fetching photos for worker:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to fetch photos for worker',
      );
    }
  }

  @Delete(':photoId')
  async deletePhoto(
    @Param('photoId', ParseIntPipe) photoId: number,
    @Req() req: Request,
  ) {
    return this.bidPhotosService.deletePhoto(photoId);
  }

  @Patch('batch/move')
  async moveMultiplePhotos(
    @Body() movePhotosDto: MovePhotosDto,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      return await this.bidPhotosService.moveMultiplePhotos(
        movePhotosDto.photoIds,
        movePhotosDto.targetTaskId,
        tenantId,
      );
    } catch (error) {
      console.error('Batch move error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Failed to move photos',
      );
    }
  }

  @Patch(':photoId/move')
  async movePhoto(
    @Param('photoId', ParseIntPipe) photoId: number,
    @Body('targetTaskId', ValidateTaskItemPipe) targetTaskId: TaskItemType,
    @Req() req: Request,
  ) {
    return this.bidPhotosService.movePhoto(photoId, targetTaskId);
  }
}
