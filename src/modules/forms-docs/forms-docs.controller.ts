  import {
      Controller,
      Post,
      Get,
      Delete,
      Param,
      Body,
      ParseIntPipe,
      UseGuards,
      UseInterceptors,
      UploadedFile,
      BadRequestException,
      Put,
      Req,
    } from '@nestjs/common';
    import { FormsDocsService } from './forms-docs.service';
    import { AuthGuard } from '../../guards/auth.guard';
    import { FileInterceptor } from '@nestjs/platform-express';
    import { CreateFolderDocDto } from './dtos/create-folder-doc.dto';
    import { UploadFileDocDto } from './dtos/upload-file-doc.dto';
    
    @Controller('forms-docs')
  @UseGuards(AuthGuard)
  export class FormsDocsController {
    constructor(private readonly formsDocsService: FormsDocsService) {}

    @Post('folders')
    async createFolder(
      @Body() createFolderDto: CreateFolderDocDto,
      @Req() req: Request
    ) {
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }
      return this.formsDocsService.createFolder(createFolderDto);
    }

    @Get('folders/:id')
    async getFolderContents(@Param('id', ParseIntPipe) folderId: number) {
      return this.formsDocsService.getFolderContents(folderId);
    }

    @Get('folders')
    async getAllFolders(@Req() req: Request) {
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }
      return this.formsDocsService.getAllFolders(tenantId);
    }

@Post('files')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 50 * 1024 * 1024 }, // max 50 MB
  fileFilter: (req, file, callback) => {
    const allowedExtensions = [
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf',
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'
    ];

    const originalName = file.originalname.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => originalName.endsWith(ext));

    if (!isAllowed) {
      return callback(
        new BadRequestException(`File type not allowed: ${file.originalname}`),
        false
      );
    }

    callback(null, true);
  },
}))
async uploadFile(
  @Req() req: Request,
  @Body() uploadFileDto: UploadFileDocDto,
  @UploadedFile() file: Express.Multer.File,
) {
  const tenantId = req['user']?.tenantId;
  if (!tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }

  const completeFileDto = {
    ...uploadFileDto,
    tenantId,
    folderId: parseInt(uploadFileDto.folderId as any, 10),
  };

  return this.formsDocsService.uploadFile(completeFileDto, file);
}

    @Get('files')
    async getAllFiles(@Req() req: Request) {
      const tenantId = req['user']?.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }
      return this.formsDocsService.getAllFiles(tenantId);
    }

    @Delete('files/:id')
    async deleteFile(@Param('id', ParseIntPipe) fileId: number) {
      return this.formsDocsService.deleteFile(fileId);
    }

    @Delete('folders/:id')
    async deleteFolder(@Param('id', ParseIntPipe) folderId: number) {
      return this.formsDocsService.deleteFolder(folderId);
    }

    @Put('folders/:id')
    async editFolder(
      @Param('id', ParseIntPipe) folderId: number,
      @Body('name') name?: string,
      @Body('parentId') parentId?: string,
    ) {
      const numericParentId = parentId ? parseInt(parentId, 10) : null;
    
      return this.formsDocsService.editFolder(folderId, name, numericParentId);
    }
    
    @Put('files/:id')
    async editFile(
      @Param('id', ParseIntPipe) fileId: number,
      @Body('name') name?: string,
      @Body('folderId', ParseIntPipe) folderId?: number,
    ) {
      return this.formsDocsService.editFile(fileId, name, folderId);
    }
  }
