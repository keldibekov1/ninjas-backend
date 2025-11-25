import { PipeTransform, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ValidateFolderExistencePipe implements PipeTransform {
  constructor(private prisma: PrismaService) {}

  async transform(folderId: number) {
    const folder = await this.prisma.folderDoc.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`);
    }

    return folderId;
  }
}
