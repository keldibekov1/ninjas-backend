import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Query,
  Put,
  UseGuards,
  Param,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, DeleteExpenseDto, FilterExpensesQueryDto, UpdateExpenseDto } from './dto';
import { WorkerService } from '../worker/worker.service';
import { AuthGuard } from '../../guards/auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('expense')
@UseGuards(AuthGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly workerService: WorkerService,
  ) {}

  // Helper method to extract tenantId consistently
  private getTenantId(req: Request): number | null {
    const user = req['user'];
    
    // For global admins, return null (they can see all tenants)
    if (user?.type === 'global_admin') {
      return null;
    }
    
    // For tenant users (admin/worker), return their tenantId
    if (user?.type === 'admin' || user?.type === 'worker') {
      const tenantId = user.tenantId;
      if (tenantId && !isNaN(Number(tenantId))) {
        return Number(tenantId);
      }
    }
    
    throw new BadRequestException('Invalid user or tenant information');
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5))
  async CreateExpense(
    @Body() data: CreateExpenseDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request
  ) {
    const tenantId = this.getTenantId(req);

    const findWorker = await this.workerService.findById(tenantId, data.workerId);
    if (!findWorker) {
      throw new NotFoundException(`worker with id ${data.workerId} not found!`);
    }

    const createExpense = await this.expenseService.create(data, files, 'ADMIN', tenantId);

    return {
      message: 'Expense is created successfully!',
      info: createExpense,
    };
  }

  @Get()
  async GetExpenses(
    @Query() query: FilterExpensesQueryDto,
    @Req() req: Request
  ) {
    const tenantId = this.getTenantId(req);

    const expenses = await this.expenseService.getExpenses(query, tenantId);

    return {
      message: 'Expenses list is retrieved successfully!',
      ...expenses,
    };
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('files', 5))
  async UpdateExpense(
    @Param('id') id: number,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request // Add req parameter for tenant validation
  ) {
    const tenantId = this.getTenantId(req);

    // Parse deleteFileIds from string to array if it exists
    const deleteFileIds = body.deleteFileIds 
      ? JSON.parse(body.deleteFileIds) 
      : [];

    // Construct DTO manually
    const updateData: UpdateExpenseDto = {
      id: +id,
      workerId: +body.workerId,
      categoryId: +body.categoryId,
      amount: +body.amount,
      action: body.action,
      date: body.date,
      deleteFileIds: deleteFileIds,
      comment: body.comment
    };

    const updatedExpense = await this.expenseService.update(updateData, files, tenantId);
    return {
      message: 'Expense is updated successfully!',
      info: updatedExpense,
    };
  }

  @Delete(':id')
  async DeleteExpense(
    @Param('id') id: number,
    @Req() req: Request // Add req parameter for tenant validation
  ) {
    const tenantId = this.getTenantId(req);

    const deletedExpense = await this.expenseService.delete({ id }, tenantId);
    return {
      message: 'Expense is deleted successfully!',
      info: deletedExpense,
    };
  }
}