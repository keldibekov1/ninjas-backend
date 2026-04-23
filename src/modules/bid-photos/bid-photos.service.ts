import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { Response } from 'express';
import * as archiver from 'archiver';
import { PhotoType } from '@prisma/client';

@Injectable()
export class BidPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async getPhotos(tenantId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        report_id_tenantId: {
          tenantId,
          report_id: orderId,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.prisma.bidPhoto.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
  }
  // eski kod
  // async getSinglePhotoStream(photoId: number, tenantId: number) {
  //   const photo = await this.prisma.bidPhoto.findUnique({
  //     where: { id: photoId, tenantId },
  //     select: { url: true, filename: true }
  //   });

  //   if (!photo) {
  //     throw new NotFoundException(`Photo with ID ${photoId} not found`);
  //   }

  //   try {
  //     const { stream, contentType, contentLength } =
  //       await this.s3Service.getFileMetadataAndStream(photo.url);

  //     return {
  //       stream,
  //       contentType,
  //       filename: photo.filename,
  //       contentLength,
  //     };
  //   } catch (error) {
  //     console.error('S3 retrieval error:', error);
  //     if (error.message.includes('NoSuchKey') || error.message.includes('NotFound')) {
  //       throw new NotFoundException('Photo file not found in storage');
  //     }
  //     throw new InternalServerErrorException('Failed to retrieve photo from storage');
  //   }
  // }

  async getSinglePhotoStream(photoId: number, tenantId: number) {
    const photo = await this.prisma.bidPhoto.findUnique({
      where: { id: photoId, tenantId },
      select: { url: true, filename: true },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found`);
    }

    try {
      let stream, contentType, contentLength;

      if (photo.url.includes('X-Amz-Signature')) {
        const axios = require('axios');
        const response = await axios.get(photo.url, { responseType: 'stream' });

        stream = response.data;
        contentType = response.headers['content-type'];
        contentLength = parseInt(response.headers['content-length'], 10);
      } else {
        // Oddiy S3 key bo‘lsa eski kod ishlaydi
        const result = await this.s3Service.getFileMetadataAndStream(photo.url);
        stream = result.stream;
        contentType = result.contentType;
        contentLength = result.contentLength;
      }

      return { stream, contentType, filename: photo.filename, contentLength };
    } catch (error) {
      console.error('S3 retrieval error:', error);
      if (
        error.message.includes('NoSuchKey') ||
        error.message.includes('NotFound')
      ) {
        throw new NotFoundException('Photo file not found in storage');
      }
      throw new InternalServerErrorException(
        'Failed to retrieve photo from storage',
      );
    }
  }

async streamPhotoZip(photoIds: number[], tenantId: number, res: Response) {
  const photos = await this.prisma.bidPhoto.findMany({
    where: {
      id: { in: photoIds },
      tenantId,
    },
    select: {
      id: true,
      url: true,
      filename: true,
    },
  });

  if (photos.length !== photoIds.length) {
    console.error('Some photos not found:', {
      requestedIds: photoIds,
      foundIds: photos.map((p) => p.id),
    });
    throw new NotFoundException('Some photos were not found');
  }

  const archive = archiver.create('zip', {
    zlib: { level: 0 },
  });

  archive.pipe(res);

  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    res.end();
  });

  archive.on('warning', (err) => {
    console.warn('Archiver warning:', err);
  });

  try {
    const CHUNK_SIZE = 5;
    for (let i = 0; i < photos.length; i += CHUNK_SIZE) {
      const chunk = photos.slice(i, i + CHUNK_SIZE);

      const streams = await Promise.all(
        chunk.map(async (photo) => {
          try {
            const stream = await this.s3Service.getFileStream(photo.url);
            return { stream, fileName: photo.filename || `photo-${photo.id}.jpg` };
          } catch (error) {
            console.error(`Failed to add photo ${photo.id} to zip:`, error);
            return null;
          }
        })
      );

      for (const item of streams) {
        if (item) {
          archive.append(item.stream, { name: item.fileName });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error creating zip:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create zip file' });
    }
    res.end();
  }
}

  async uploadPhotos(
    tenantId: number,
    orderId: number,
    files: Express.Multer.File[],
    taskItem: string,
    taskItemId?: number,
    metadata?: string | string[], // Add metadata parameter
    photoType: PhotoType = PhotoType.BID,
  ) {
    // Convert metadata to array if it's a single string
    const metadataArray = Array.isArray(metadata)
      ? metadata
      : metadata
      ? [metadata]
      : [];
    const order = await this.prisma.order.findUnique({
      where: {
        report_id_tenantId: {
          report_id: orderId,
          tenantId,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const uploadPromises = files.map(async (file, index) => {
      const key = `bid-photos/${orderId}/${Date.now()}-${file.originalname}`;

      // Upload to S3
      const uploadedUrl = await this.s3Service.uploadFile(
        file.buffer,
        key,
        file.mimetype,
      );

      // Parse metadata for this file
      let parsedMetadata = null;
      if (metadata && metadata[index]) {
        try {
          parsedMetadata = JSON.parse(metadataArray[index]);
        } catch (error) {
          console.error('Failed to parse metadata:', error);
          parsedMetadata = { error: 'Invalid metadata format' };
        }
      }

      // Create database record with metadata

      return this.prisma.bidPhoto.create({
        data: {
          url: uploadedUrl,
          filename: file.originalname,
          taskItem,
          taskItemId: taskItemId ?? null,
          metadata: parsedMetadata, // Add metadata to the record
          order: { connect: { id: order.id } },
          tenant: { connect: { id: tenantId } },
          photoType,
        },
      });
    });

    const photos = await Promise.all(uploadPromises);
    return { message: 'Photos uploaded successfully', photos };
  }

  async deletePhoto(photoId: number) {
    const photo = await this.prisma.bidPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Extract key from URL
    const urlPath = new URL(photo.url).pathname;
    const key = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;

    // Delete from S3
    await this.s3Service.deleteFile(key);

    // Delete from database
    await this.prisma.bidPhoto.delete({
      where: { id: photoId },
    });

    return { message: 'Photo deleted successfully' };
  }

  async movePhoto(photoId: number, targetTaskId: string) {
    const photo = await this.prisma.bidPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.prisma.bidPhoto.update({
      where: { id: photoId },
      data: { taskItem: targetTaskId },
    });

    return { message: 'Photo moved successfully' };
  }

  async moveMultiplePhotos(
    photoIds: number[],
    targetTaskId: string,
    tenantId: number,
  ) {
    // First verify all photos exist and belong to the tenant
    const photos = await this.prisma.bidPhoto.findMany({
      where: {
        id: { in: photoIds },
        tenant: { id: tenantId },
      },
    });

    if (photos.length !== photoIds.length) {
      const foundIds = photos.map((p) => p.id);
      const missingIds = photoIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Some photos were not found: ${missingIds.join(', ')}`,
      );
    }

    // Update all photos in a single transaction
    const updates = await this.prisma.$transaction(
      photoIds.map((photoId) =>
        this.prisma.bidPhoto.update({
          where: { id: photoId },
          data: { taskItem: targetTaskId },
        }),
      ),
    );

    return {
      message: 'Photos moved successfully',
      movedCount: updates.length,
      photos: updates,
    };
  }
}
