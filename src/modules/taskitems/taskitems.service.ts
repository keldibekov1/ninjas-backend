import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  UpdateTaskitemsDto, 
  AddTaskitemsDto, 
  DeleteTaskitemsDto,
} from './dto/taskitems.dto';

@Injectable()
export class TaskitemsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(filters?: { 
    tenantId?: number; 
    search?: string; 
    taskItemId?: number;
    page?: number;
    limit?: number;
  }) {
    try {
      const taskItems = await this.prisma.taskitems.findMany({
        where: {
          ...(filters?.tenantId && { tenantId: filters.tenantId }),
          ...(filters?.taskItemId && { id: filters.taskItemId }),
          item_name: filters?.search
            ? {
                contains: filters.search,
                mode: 'insensitive',
              }
            : undefined,
        },
        select: {
          id: true,
          item_name: true,
          price: true,
          tenantId: true,
          createdAt: true,
        },
        ...(filters?.page && filters?.limit && {
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        orderBy: {
          createdAt: 'desc',
        },
      });
  
      const totalCount = await this.prisma.taskitems.count({
        where: {
          ...(filters?.tenantId && { tenantId: filters.tenantId }),
          ...(filters?.taskItemId && { id: filters.taskItemId }),
          item_name: filters?.search
            ? {
                contains: filters.search,
                mode: 'insensitive',
              }
            : undefined,
        },
      });
  
      const transformedTaskItems = taskItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));
  
      return {
        total: totalCount,
        page: filters?.page || 1,
        limit: filters?.limit || totalCount,
        data: transformedTaskItems,
      };
    } catch (error) {
      console.error('Error in getAllTaskItems:', error);
      throw new InternalServerErrorException(error.message);
    }
  }


  async add(addTaskitemsDto: AddTaskitemsDto & { tenantId: number }) {
    try {
      const { tenantId, item_name, price } = addTaskitemsDto;
      return this.prisma.taskitems.create({
        data: {
          tenantId,
          item_name,
          price,
        },
      });
    } catch (error) {
      console.error('Error in add task item:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(updateTaskitemsDto: UpdateTaskitemsDto & { tenantId: number }) {
    try {
      const { id, tenantId, item_name, price } = updateTaskitemsDto;

      const existingTaskItem = await this.prisma.taskitems.findUnique({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });

      if (!existingTaskItem) {
        throw new NotFoundException(`Task item with id ${id} not found`);
      }

      return this.prisma.taskitems.update({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
        data: {
          item_name,
          price,
        },
      });
    } catch (error) {
      console.error('Error in update task item:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async delete(deleteTaskitemsDto: DeleteTaskitemsDto & { tenantId: number }) {
    try {
      const { id, tenantId } = deleteTaskitemsDto;

      const existingTaskItem = await this.prisma.taskitems.findUnique({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });

      if (!existingTaskItem) {
        throw new NotFoundException(`Task item with id ${id} not found`);
      }

      return this.prisma.taskitems.delete({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          } 
        },
      });
    } catch (error) {
      console.error('Error in delete task item:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}