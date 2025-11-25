import { Controller, Put, Post, Delete, Body, Query, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { TaskitemsService } from './taskitems.service';
import { UpdateTaskitemsDto, AddTaskitemsDto, DeleteTaskitemsDto, GetTaskitemsDto } from './dto/taskitems.dto';
import { AuthGuard } from '../../guards/auth.guard';


@Controller('taskitems')
@UseGuards(AuthGuard)
export class TaskitemsController {
  constructor(private readonly taskitemsService: TaskitemsService) {}

  @Put('update')
  async updateTaskitems(@Body() updateTaskitemsDto: UpdateTaskitemsDto) {
    return this.taskitemsService.update(updateTaskitemsDto);
  }

  @Post('add') 
async addTaskitems(
  @Req() req: Request,
  @Body() addTaskitemsDto: AddTaskitemsDto
) {
  // Extract tenantId from the logged-in user
  const tenantId = req['user']?.tenantId;
  if (!tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }

  return this.taskitemsService.add({
    ...addTaskitemsDto,
    tenantId // Now correctly passes a number
  });
}

@Delete('delete')
async deleteTaskitems(
  @Req() req: Request,
  @Body() deleteTaskitemsDto: DeleteTaskitemsDto
) {
  const tenantId = req['user']?.tenantId;
  if (!tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }

  return this.taskitemsService.delete({
    ...deleteTaskitemsDto,
    tenantId
  });
}

@Get('get')
async getTaskItems(
  @Req() req: Request,
  @Query('search') search?: string,
  @Query('page') page?: number,
  @Query('limit') limit?: number,

) {
  const tenantId = req['user']?.tenantId;
  if (!tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }

  return this.taskitemsService.get({ search, page, limit, tenantId });
}
}