import { Controller, Put, Post, Delete, Body, Query, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ExpenseCategoriesService } from './expensecategory.service';
import { UpdateExpenseCategoriesDto, AddExpenseCategoriesDto, DeleteExpenseCategoriesDto, GetExpenseCategoriesDto } from './dto/expensecategory.dto';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoriesController {
  constructor(private readonly ExpenseCategoriesService: ExpenseCategoriesService) {}

  @Put('update')
  async updateExpenseCategory(
    @Req() req: Request,
    @Body() UpdateExpenseCategoriesDto: UpdateExpenseCategoriesDto
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.ExpenseCategoriesService.update({
      ...UpdateExpenseCategoriesDto,
      tenantId
    });
  }

  @Post('add') 
  async addExpenseCategory(
    @Req() req: Request,
    @Body() AddExpenseCategoriesDto: AddExpenseCategoriesDto
  ) {
    // Extract tenantId from the logged-in user
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.ExpenseCategoriesService.add({
      ...AddExpenseCategoriesDto,
      tenantId
    });
  }

  @Delete('delete')
  async deleteExpenseCategory(
    @Req() req: Request,
    @Body() deleteExpenseCategorysDto: DeleteExpenseCategoriesDto
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.ExpenseCategoriesService.delete({
      ...deleteExpenseCategorysDto,
      tenantId
    });
  }


  @Get('get')
  async getExpenseCategories(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    
    return this.ExpenseCategoriesService.get({
      search, page, limit, tenantId
    });
  }
}
