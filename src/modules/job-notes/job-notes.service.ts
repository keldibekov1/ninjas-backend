import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobNotesDto, UpdateJobNotesDto } from './dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class JobNotesService {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly s3Service: S3Service) {}

    public async create(data: CreateJobNotesDto, files?: Express.Multer.File[]) {
      const uploadedFiles = files ? await Promise.all(
        files.map(async (file) => {
          const key = `job-notes/${data.tenantId}/${Date.now()}-${file.originalname}`;
          const fileUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
          return {
            fileName: file.originalname,
            fileUrl
          };
        })
      ) : [];
  
      return this.prisma.jobNote.create({
        data: {
          report_id: data.report_id,
          tenantId: data.tenantId,
          note_text: data.note_text,
          files: {
            create: uploadedFiles
          }
        },
        include: {
          files: true
        }
      });
    }


  public getJobNotesByReportId(report_id: number) {
    return this.prisma.jobNote.findMany({
      where: {
        report_id,
      },
    });
  }

  public findById(id: number) {
    return this.prisma.jobNote.findUnique({
      where: {
        id,
      },
    });
  }

  public async update(id: number, data: UpdateJobNotesDto, files?: Express.Multer.File[]) {
    // Delete specified files
    if (data.deleteFileIds && data.deleteFileIds.length > 0) {
      await Promise.all(
        data.deleteFileIds.map(async (fileId) => {
          const fileToDelete = await this.prisma.jobNoteFile.findUnique({
            where: { id: fileId }
          });
          
          if (fileToDelete) {
            await this.s3Service.deleteFile(new URL(fileToDelete.fileUrl).pathname);
            await this.prisma.jobNoteFile.delete({
              where: { id: fileId }
            });
          }
        })
      );
    }

    // Upload new files
    const uploadedFiles = files ? await Promise.all(
      files.map(async (file) => {
        const key = `job-notes/${id}/${Date.now()}-${file.originalname}`;
        const fileUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
        return {
          fileName: file.originalname,
          fileUrl
        };
      })
    ) : [];

    return this.prisma.jobNote.update({
      where: { id },
      data: {
        files: {
          create: uploadedFiles
        }
      },
    });
  }

  public async delete(id: number) {
    // Find the job note and associated files
    const jobNote = await this.prisma.jobNote.findUnique({
      where: { id },
      include: { files: true },
    });
  
    if (!jobNote) {
      throw new NotFoundException(`Job note with id ${id} not found`);
    }
  
    // Delete the associated files from S3
    await Promise.all(
      jobNote.files.map(async (file) => {
        const urlPath = new URL(file.fileUrl).pathname;
        const key = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
        await this.s3Service.deleteFile(key);
      })
    );
  
    // Delete the job note files
    await this.prisma.jobNoteFile.deleteMany({
      where: {
        jobNoteId: id,
      },
    });
  
    // Delete the job note
    return this.prisma.jobNote.delete({
      where: { id },
    });
  }
}
