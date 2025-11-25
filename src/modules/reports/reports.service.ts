import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetReportsDto } from './dto/get-reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllWorkerReports(filters: GetReportsDto, tenantId: number) {
    try {
      const { page = 1, limit = 10, workerId, keywords, from_date, to_date } = filters;
      const skip = (page - 1) * limit;
    
      const workers = await this.prisma.worker.findMany({
        where: {
          tenantId, // Add tenant isolation
          ...(workerId && { id: workerId }),
          ...(keywords && {
            OR: [
              { name: { contains: keywords, mode: 'insensitive' } },
              { 
                completedTasks: { 
                  some: { 
                    desc: { contains: keywords, mode: 'insensitive' },
                    tenantId, // Add tenant isolation to completedTasks
                  } 
                } 
              },
            ]
          }),
          ...(from_date && to_date && {
            shiftTimeRecords: {
              some: {
                tenantId, // Add tenant isolation to shiftTimeRecords
                date: {
                  gte: new Date(from_date),
                  lte: new Date(to_date),
                },
              },
            }
          }),
        },
        select: {
          id: true,
          name: true,
          daily_pay_rate: true,
          extra_hourly_rate: true,
          tenantId: true, // Include tenantId in selection
          assignments: {
            where: {
              tenantId, // Add tenant isolation to assignments
            },
            select: {
              order: {
                select: {
                  id: true,
                  report_id: true,
                  wo_number: true,
                  wo_status: true,
                  completed_date: true,
                  tenantId: true, // Include tenantId in selection
                },
              },
            },
          },
          completedTasks: {
            where: {
              tenantId, // Add tenant isolation to completedTasks
            },
            select: {
              id: true,
              report_id: true,
              qty: true,
              price: true,
              total: true,
              isCompleted: true,
              completedWorker: true,
              completedDate: true,
              tenantId: true, // Include tenantId in selection
            },
          },
          shiftTimeRecords: {
            where: {
              tenantId, // Add tenant isolation to shiftTimeRecords
            },
            select: {
              id: true,
              worker_id: true,
              date: true,
              clockin_time: true,
              finishjob_time: true,
              clockout_time: true,
              tenantId: true, // Include tenantId in selection
            },
          },
          earnings: {
            where: {
              tenantId, // Add tenant isolation to earnings
            },
            select: {
              id: true,
              workerId: true,
              amount: true,
              action: true,
              comment: true,
              date: true,
              tenantId: true, // Include tenantId in selection
            },
          },
        },
        skip,
        take: limit,
      });

      const totalCount = await this.prisma.worker.count({
        where: {
          tenantId, // Add tenant isolation
          ...(workerId && { id: workerId }),
          ...(keywords && {
            OR: [
              { name: { contains: keywords, mode: 'insensitive' } },
              { 
                completedTasks: { 
                  some: { 
                    desc: { contains: keywords, mode: 'insensitive' },
                    tenantId, // Add tenant isolation to completedTasks
                  } 
                } 
              },
            ]
          }),
          ...(from_date && to_date && {
            shiftTimeRecords: {
              some: {
                tenantId, // Add tenant isolation to shiftTimeRecords
                date: {
                  gte: new Date(from_date),
                  lte: new Date(to_date),
                },
              },
            }
          }),
        },
      });
  
      // Transform dates to ISO strings
      const transformedWorkers = workers.map((worker) => ({
        ...worker,
        assignments: worker.assignments.map((assignment) => ({
          ...assignment,
          order: {
            ...assignment.order,
            completed_date: assignment.order.completed_date?.toISOString() ?? null,
          },
        })),
        completedTasks: worker.completedTasks.map((task) => ({
          ...task,
          completedDate: task.completedDate?.toISOString() ?? null,
        })),
        shiftTimeRecords: worker.shiftTimeRecords.map((record) => ({
          ...record,
          date: record.date.toISOString(),
        })),
        earnings: worker.earnings.map((earning) => ({
          ...earning,
          date: earning.date.toISOString(),
        })),
      }));
  
      return {
        total: totalCount,
        page,
        limit,
        data: transformedWorkers,
      };
    } catch (error) {
      console.error('Error in getAllWorkerReports:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}