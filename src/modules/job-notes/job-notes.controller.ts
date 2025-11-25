import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JobNotesService } from './job-notes.service';
import { CreateJobNotesDto, UpdateJobNotesDto } from './dto';
import { ApiPpwService } from '../api-ppw/api-ppw.service';
import { OrdersService } from '../orders/orders.service';
import { AuthGuard } from 'src/guards';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('job-notes')
@UseGuards(AuthGuard)
export class JobNotesController {
  constructor(
    private readonly jobNotesService: JobNotesService,
    private readonly apiPpwService: ApiPpwService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5))
  async CreateJobNote(
   @Body() body: CreateJobNotesDto, 
   @UploadedFiles() files: Express.Multer.File[], 
   @Req() req: Request
  ) {
   const tenantId = req['user']?.tenantId;
   if (!tenantId) {
     throw new BadRequestException('Tenant ID is required');
   }
  
   const data: CreateJobNotesDto = {
      report_id: body.report_id,
      tenantId,
      note_text: body.note_text,
      files: files.map((file) => ({ fileName: file.originalname, fileUrl: 'TODO' }))
   };
  
   const create = await this.jobNotesService.create(data, files);
  
   return {
     message: 'Created!',
     info: create,
   };
  }

@Put(':id')
@UseInterceptors(FilesInterceptor('files', 5))
async UpdateJobNote(
 @Param('id') id: number, 
 @Body() body: any, 
 @UploadedFiles() files: Express.Multer.File[]
) {
 const deleteFileIds = body.deleteFileIds ? JSON.parse(body.deleteFileIds) : [];

 const updateData: UpdateJobNotesDto = {
    report_id: +body.report_id,
    deleteFileIds,
    note_text: body.note_text,
 };

 const updated = await this.jobNotesService.update(+id, updateData, files);

 return {
   message: 'Updated!',
   info: updated,
 };
}

  @Get(':report_id')
  async GetJobNotesByReportId(@Param('report_id') report_id: string, tenantId: number) {
    const job_notes = await this.apiPpwService.getJobNotes(+report_id, tenantId);

    return {
      message: 'Ok',
      info: job_notes.data.result_data,
    };
  }

  @Delete(':id')
  async DeleteJobNote(@Param('id') id: string) {
    const findById = await this.jobNotesService.findById(+id);
    if (!findById) {
      throw new NotFoundException(`job note with id ${id} not found!`);
    }

    // delete from synced database
    await this.jobNotesService.delete(+id);

    return {
      message: 'Job note is deleted successfully!',
      ID: +id,
    };
  }
}
