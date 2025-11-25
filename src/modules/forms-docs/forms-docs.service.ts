import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateFolderDocDto } from './dtos/create-folder-doc.dto';
import { UploadFileDocDto } from './dtos/upload-file-doc.dto';

@Injectable()
export class FormsDocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createFolder(createFolderDto: CreateFolderDocDto) {
    const {tenantId, name, parentId } = createFolderDto;

    if (parentId) {
      const parentFolder = await this.prisma.folderDoc.findUnique({
        where: { id: parentId },
      });
      if (!parentFolder) {
        throw new NotFoundException(`Parent folder with ID ${parentId} not found`);
      }
    }

    return this.prisma.folderDoc.create({
      data: {tenantId, name, parentId },
    });
  }

  async getFolderContents(folderId: number) {
    const folder = await this.prisma.folderDoc.findUnique({
      where: { id: folderId },
      include: {
        children: true,
        files: true,
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`);
    }

    return folder;
  }

  async getAllFolders(tenantId: number) {
    return this.prisma.folderDoc.findMany({
      where: { 
        tenantId // This ensures users only get folders from their tenant
      },
      include: {
        // Only include children that belong to the same tenant
        children: {
          where: {
            tenantId
          }
        },
        // Only include files that belong to the same tenant
        files: {
          where: {
            tenantId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getAllFiles(tenantId: number) {
    return this.prisma.fileDoc.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async uploadFile(uploadFileDto: UploadFileDocDto, file: Express.Multer.File) {
    const {tenantId, folderId, name } = uploadFileDto;

    const folder = await this.prisma.folderDoc.findUnique({
      where: { id: folderId },
    });
    if (!folder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`);
    }

    const key = `forms-docs/${folderId}/${Date.now()}-${file.originalname}`;
    const fileUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);

    return this.prisma.fileDoc.create({
      data: {
        tenantId,
        name: name || null,
        filename: file.originalname,
        url: fileUrl,
        folderId,
      },
    });
  }

  async deleteFile(fileId: number) {
    const file = await this.prisma.fileDoc.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const urlPath = new URL(file.url).pathname;
    const key = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    await this.s3Service.deleteFile(key); // Delete the file from S3.

    return this.prisma.fileDoc.delete({
      where: { id: fileId },
    });
  }

  async deleteFolder(folderId: number) {
    const folder = await this.prisma.folderDoc.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`);
    }

    // Delete files in the folder from S3.
    const files = await this.prisma.fileDoc.findMany({
      where: { folderId },
    });
    for (const file of files) {
      const urlPath = new URL(file.url).pathname;
      const key = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      await this.s3Service.deleteFile(key); // Delete each file from S3.
    }

    // Delete all files associated with the folder in the database.
    await this.prisma.fileDoc.deleteMany({
      where: { folderId },
    });

    // Check if the folder contains subfolders.
    const subfolders = await this.prisma.folderDoc.findMany({
      where: { parentId: folderId },
    });
    if (subfolders.length > 0) {
      throw new BadRequestException(
        `Cannot delete folder with ID ${folderId} because it contains subfolders`,
      );
    }

    // Finally, delete the folder.
    return this.prisma.folderDoc.delete({
      where: { id: folderId },
    });
  }

  async editFolder(folderId: number, name?: string, parentId?: number | null) {
    const folder = await this.prisma.folderDoc.findUnique({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`);
    }

    const updateData: any = {};
    if (name) {
      updateData.name = name;
    }

    if (parentId !== undefined) {
      if (folderId === parentId) {
        throw new BadRequestException(`A folder cannot be its own parent`);
      }

      if (parentId !== null) { // Assuming null is the root folder
        const parentFolder = await this.prisma.folderDoc.findUnique({ where: { id: parentId } });
        if (!parentFolder) {
          throw new NotFoundException(`Parent folder with ID ${parentId} not found`);
        }

        // Check for circular references
        let currentFolder = parentFolder;
        while (currentFolder?.parentId) {
          if (currentFolder.parentId === folderId) {
            throw new BadRequestException(`Circular reference detected`);
          }
          currentFolder = await this.prisma.folderDoc.findUnique({
            where: { id: currentFolder.parentId },
          });
        }
      }

      updateData.parentId = parentId; // Can be null for root folders
    }

    return this.prisma.folderDoc.update({
      where: { id: folderId },
      data: updateData,
    });
  }

  async editFile(fileId: number, name?: string, folderId?: number) {
    const file = await this.prisma.fileDoc.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const updateData: any = {};
    if (name) {
      updateData.name = name;
    }
    if (folderId !== undefined) {
      const folder = await this.prisma.folderDoc.findUnique({ where: { id: folderId } });
      if (!folder) {
        throw new NotFoundException(`Folder with ID ${folderId} not found`);
      }
      updateData.folderId = folderId;
    }

    return this.prisma.fileDoc.update({
      where: { id: fileId },
      data: updateData,
    });
  }
}
