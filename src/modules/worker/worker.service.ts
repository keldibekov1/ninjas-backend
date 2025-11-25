import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto, UpdateWorkerDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WorkerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateWorkerDto & { tenantId: number }) {
    try {
      console.log('Creating worker with data:', data);
      
      // Validate required fields
      if (!data.name || !data.username || !data.password || !data.tenantId) {
        throw new Error('Missing required worker creation fields');
      }
  
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const createdWorker = await this.prisma.worker.create({
        data: {
          name: data.name,
          username: data.username,
          password: hashedPassword,
          tenantId: data.tenantId,
          groupId: data.groupId || null,
          daily_pay_rate: Number(data.daily_pay_rate),
          extra_hourly_rate: Number(data.extra_hourly_rate)
        },
      });
  
      console.log('Worker created successfully:', createdWorker);
      return createdWorker;
    } catch (error) {
      console.error('Detailed worker creation error:', error);
      throw new InternalServerErrorException(`Failed to create worker: ${error.message}`);
    }
  }

  async getWorkers(options?: { tenantId?: number; keyword?: string; }) {
    try {
      return await this.prisma.worker.findMany({
        where: {
          ...(options?.tenantId && { tenantId: options.tenantId }),
          name: options?.keyword
            ? {
                contains: options.keyword,
                mode: 'insensitive',
              }
            : undefined,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          username: true,
          groupId: true,
          daily_pay_rate: true,
          extra_hourly_rate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve workers: ' + error.message);
    }
  }

  findByUsername(tenantId: number, username: string) {
    return this.prisma.worker.findUnique({
      where: { 
        username_tenantId: { 
          username, 
          tenantId 
        } 
      },
    });
  }

  findByUsernamelogin(username: string) {
    return this.prisma.worker.findFirst({
      where: { username: username },
      select: {
        id: true,
        name:true,
        username: true,
        password:true,
        tenantId: true,
        groupId: true,
      },
    });
  }

  findById(tenantId: number, id: number) {
    return this.prisma.worker.findFirst({
      where: { 
        id, 
        tenantId 
      },
    });
  }

  async update(tenantId: number, id: number, data: UpdateWorkerDto) {
    try {
      let updatedData = { ...data };
  
      if (data.password) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        updatedData.password = hashedPassword;
      } else {
        delete updatedData.password;
      }
  
      return this.prisma.worker.update({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          }
        },
        data: updatedData,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update worker: ' + error.message);
    }
  }

  delete(tenantId: number, id: number) {
    return this.prisma.worker.deleteMany({
      where: { 
        id, 
        tenantId 
      },
    });
  }
}