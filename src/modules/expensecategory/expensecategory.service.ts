import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  UpdateExpenseCategoriesDto, 
  AddExpenseCategoriesDto, 
  DeleteExpenseCategoriesDto,
} from './dto/expensecategory.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filters?: { 
    tenantId?: number; 
    search?: string; 
    id?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    try {
      // Ensure search is trimmed and lowercased for more flexible matching
      const searchTerm = filters?.search?.trim().toLowerCase();
  
      const whereClause = {
        ...(filters?.tenantId && { tenantId: filters.tenantId }),
        ...(filters?.id && { id: filters.id }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(searchTerm ? {
          OR: [
            { 
              name: { 
                contains: searchTerm, 
                mode: 'insensitive' as const
              } 
            },
            { 
              description: { 
                contains: searchTerm, 
                mode: 'insensitive' as const
              } 
            }
          ]
        } : undefined),
      };
  
      const expenseCategories = await this.prisma.expenseCategory.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          tenantId: true,
          createdAt: true,
        },
        ...(filters?.page && filters?.limit && {
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        orderBy: { createdAt: 'desc' }
      });
  
      const totalCount = await this.prisma.expenseCategory.count({
        where: whereClause,
      });
  
      // Transform dates to ISO strings
      const transformedExpenseCategories = expenseCategories.map((category) => ({
        ...category,
        createdAt: category.createdAt.toISOString(),
      }));
    
      return {
        total: totalCount,
        page: filters?.page || 1,
        limit: filters?.limit || totalCount,
        data: transformedExpenseCategories,
      };
    } catch (error) {
      console.error('Error in getAllExpenseCategories:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async add(addExpenseCategorysDto: AddExpenseCategoriesDto & { tenantId: number }) {
    try {
      const { tenantId, name, description, isActive } = addExpenseCategorysDto;
      return this.prisma.expenseCategory.create({
        data: {
          tenantId,
          name,
          description,
          isActive,
        },
      });
    } catch (error) {
      console.error('Error in add expense category:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(updateExpenseCategorysDto: UpdateExpenseCategoriesDto & { tenantId: number }) {
    try {
      const { id, tenantId, name, description, isActive } = updateExpenseCategorysDto;

      const existingExpenseCategory = await this.prisma.expenseCategory.findUnique({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });

      if (!existingExpenseCategory) {
        throw new NotFoundException(`Expense category with id ${id} not found`);
      }

      return this.prisma.expenseCategory.update({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
        data: {
          name,
          description,
          isActive,
        },
      });
    } catch (error) {
      console.error('Error in update expense category:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async delete(deleteExpenseCategorysDto: DeleteExpenseCategoriesDto & { tenantId: number }) {
    try {
      const { id, tenantId } = deleteExpenseCategorysDto;

      const existingExpenseCategory = await this.prisma.expenseCategory.findUnique({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });

      if (!existingExpenseCategory) {
        throw new NotFoundException(`Expense category with id ${id} not found`);
      }

      return this.prisma.expenseCategory.delete({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });
    } catch (error) {
      console.error('Error in delete expense category:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}