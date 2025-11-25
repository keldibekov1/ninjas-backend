import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, OrderStatus } from '@prisma/client';
import { WorkOrderType } from './types';
import { FilerOrdersQueryDto, UpdateWorkOrderDto } from './dto';
import { ExpenseService } from '../expense/expense.service';
import { S3Service } from '../s3/s3.service';


@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService,
    private readonly expenseService: ExpenseService,
    private readonly s3Service: S3Service
  ) {}

  async getOrdersWithoutCoordinates(tenantId: number) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        coordinates: null,
        address: { not: null },
        city: { not: null },
        state: { not: null },
      },
      select: {
        report_id: true,
        address: true,
        city: true,
        state: true,
      },
    });
  }
  
  async updateCoordinates(
    report_id: number,
    tenantId: number,
    coordinates: string,
  ) {
    return this.prisma.order.update({
      where: { 
        report_id_tenantId: { 
          report_id, 
          tenantId 
        } 
      },
      data: { coordinates },
    });
  }

  async getSyncStatus(tenantId: number) {
    const syncStatus = await this.prisma.syncStatus.findUnique({
      where: { tenantId }
    });
    
    return {
      isRunning: !!syncStatus?.isRunning,
      progress: syncStatus?.progress || 0
    };
  }

// Add this new helper method
private async generateManualReportId(tenantId: number): Promise<number> {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2);
  
  // Get the base number for today
  const baseNumber = parseInt(`${tenantId}${dd}${mm}${yy}00`);
  
  // Find the latest report_id for today
  const latestOrder = await this.prisma.order.findFirst({
    where: {
      tenantId,
      report_id: {
        gte: baseNumber,
        lt: baseNumber + 100 // Look for entries only from today
      }
    },
    orderBy: {
      report_id: 'desc'
    }
  });
  
  if (!latestOrder) {
    return baseNumber + 1; // First order of the day
  }
  
  return latestOrder.report_id + 1;
}

async createManualOrder(data: Omit<WorkOrderType, 'report_id'>): Promise<WorkOrderType> {
  try {
    const report_id = await this.generateManualReportId(data.tenantId);
    
    // Prepare order data with the generated report_id
    const orderData = {
      ...data,
      report_id,
      // Set default values for required fields if not provided
      wo_status: data.wo_status || 'NEW',
      wo_number: data.wo_number || `WO-${report_id}`,
      date_received: data.date_received || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create the order with the generated report_id
    const newOrder = await this.prisma.order.create({
      data: orderData
    });

    return newOrder;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('A work order with this report ID already exists');
      }
    }
    throw new InternalServerErrorException(`Failed to create work order: ${error.message}`);
  }
}

async findByReportId(
  tenantId: number,
  report_id: number,
  includeTasks: boolean = false,
  includeJobNotes: boolean = false
) {
  const order = await this.prisma.order.findUnique({
    where: {
      report_id_tenantId: {
        report_id,
        tenantId,
      },
    },
    include: {
      Tasks: includeTasks
        ? {
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              TaskTimeRecords: {
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          }
        : false,
      JobNotes: includeJobNotes
        ? {
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              files: true,
            },
          }
        : false,
      Workers: {
        include: {
          worker: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      CrewAssignments: {
        include: {
          crew: {
            include: {
              members: {
                include: {
                  worker: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      }
    },
  });

  if (order) {
    return {
      ...order,
      assigned_workers: [
        // Individual worker assignments
        ...order.Workers.map(assignment => ({
          assignmentId: assignment.id,
          type: 'worker' as const,
          workerId: assignment.worker_id,
          worker: assignment.worker.name,
        })),
        // Crew assignments
        ...order.CrewAssignments.map(assignment => ({
          assignmentId: assignment.id,
          type: 'crew' as const,
          crewId: assignment.crew.id,
          crewName: assignment.crew.name,
          crewMembers: assignment.crew.members.map(member => ({
            workerId: member.worker.id,
            workerName: member.worker.name,
            isLeader: member.isLeader
          }))
        }))
      ]
    };
  }

  return null;
}

  async getWorkTypes(tenantId: number) {
    const workTypes = await this.prisma.order.findMany({
      where: { 
        tenantId,
        NOT: {
          work_type_alias: null
        }
      },
      select: {
        work_type_alias: true
      },
      distinct: ['work_type_alias']
    });
  
    // Extract and sort the work types
    return workTypes
      .map(item => item.work_type_alias)
      .filter(Boolean) // Remove any null or undefined values
      .sort();
  }

  async getCities(tenantId: number) {
    const cities = await this.prisma.order.findMany({
      where: { 
        tenantId,
        NOT: {
          city: null
        }
      },
      select: {
        city: true
      },
      distinct: ['city']
    });
  
    return cities
      .map(item => item.city)
      .filter(Boolean)
      .sort();
  }
  
  async getStates(tenantId: number) {
    const states = await this.prisma.order.findMany({
      where: { 
        tenantId,
        NOT: {
          state: null
        }
      },
      select: {
        state: true
      },
      distinct: ['state']
    });
  
    return states
      .map(item => item.state)
      .filter(Boolean)
      .sort();
  }

async getOrders(query: FilerOrdersQueryDto, tenantId: number) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = query.limit || Number.MAX_SAFE_INTEGER;

  const whereConditions: Prisma.OrderWhereInput = {
    tenantId: { equals: tenantId }, 
    report_id: query.report_id ? { equals: query.report_id } : undefined,
    wo_number: query.wo_numbers
      ? { in: query.wo_numbers }
      : undefined,
    loan_number: query.loan_number ? { contains: query.loan_number, mode: 'insensitive' } : undefined,
    status: query.statuses 
      ? { in: query.statuses as OrderStatus[] }
      : query.status 
      ? { equals: query.status as OrderStatus }
      : undefined,
    address: query.address ? { contains: query.address, mode: 'insensitive' } : undefined,
    city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
    state: query.state ? { contains: query.state, mode: 'insensitive' } : undefined,
    zip: query.zip_code ? { contains: query.zip_code, mode: 'insensitive' } : undefined,
    work_type_alias: query.work_type_alias
    ? Array.isArray(query.work_type_alias)
      ? { in: query.work_type_alias }
      : { in: query.work_type_alias.split(',').map(alias => alias.trim()) }
    : undefined,
    Workers: query.workerIds
      ? {
          some: {
            worker_id: { in: query.workerIds },
          },
        }
      : query.workerId
      ? {
          some: {
            worker_id: { equals: query.workerId },
          },
        }
      : undefined,
    OR: query.keyword
      ? [
          { wo_number: { contains: query.keyword, mode: 'insensitive' } },
          { loan_number: { contains: query.keyword, mode: 'insensitive' } },
          { address: { contains: query.keyword, mode: 'insensitive' } },
          { city: { contains: query.keyword, mode: 'insensitive' } },
          { state: { contains: query.keyword, mode: 'insensitive' } },
          { zip: { contains: query.keyword, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const orders = await this.prisma.order.findMany({
    where: whereConditions,
    include: {
      Tasks: {
        include: { TaskTimeRecords: true },
        orderBy: { createdAt: 'asc' },
      },
      JobNotes: {
        include: {
          files: true
        },
        orderBy: { createdAt: 'desc' },
      },
      Workers: {
        include: {
          worker: true,
        }
      },
      CrewAssignments: {
        include: {
          crew: {
            include: {
              members: {
                include: {
                  worker: true
                }
              }
            }
          }
        }
      },
      expenses: {
        include: {
          worker: {
            select: {
              name: true
            }
          },
          category: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      bidPhotos: {
        select: {
          id: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });
  
  const totalOrders = await this.prisma.order.count({
    where: whereConditions,
  });
  
  const meta = {
    currentPage: page,
    limit,
    totalOrders,
    total_pages: Math.ceil(totalOrders / limit),
  };
  
  const processedOrders = orders.map((order) => ({
    ...order,
    photo_count: order.bidPhotos?.length || 0,
    assigned_workers: [
      // Individual worker assignments
      ...order.Workers.map(assignment => ({
        assignmentId: assignment.id,
        type: 'worker' as const,
        workerId: assignment.worker_id,
        worker: assignment.worker.name,
      })),
      // Crew assignments
      ...order.CrewAssignments.map(assignment => ({
        assignmentId: assignment.id,
        type: 'crew' as const,
        crewId: assignment.crew.id,
        worker: assignment.crew.name,
        crewName: assignment.crew.name,
        crewMembers: assignment.crew.members.map(member => ({
          workerId: member.worker.id,
          workerName: member.worker.name,
          isLeader: member.isLeader
        }))
      }))
    ],
    tasks: order.Tasks,
    job_notes: order.JobNotes.map(note => ({
      id: note.id,
      report_id: note.report_id,
      note_text: note.note_text,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      files: note.files.map(file => ({
        fileName: file.fileName,
        fileUrl: file.fileUrl
      }))
    })),
    expenses: order.expenses.map(expense => ({
      id: expense.id,
      amount: expense.amount,
      action: expense.action,
      date: expense.date,
      worker: expense.worker?.name,
      category: expense.category?.name,
      comment: expense.comment,
    })),
    expense_summary: {
      total: order.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      spending: order.expenses.filter(e => e.action === 'SPENDING')
        .reduce((sum, expense) => sum + expense.amount, 0),
      penalties: order.expenses.filter(e => e.action === 'PENALTY')
        .reduce((sum, expense) => sum + expense.amount, 0)
    }
  }));
  const cleanedOrders = processedOrders.map(order => {
    const { bidPhotos, ...cleanOrder } = order;
    return cleanOrder;
  });
  
  return {
    message: 'Ok',
    isInitial: page === 1,
    orders: {
      meta,
      data: cleanedOrders,
    },
  };
}
  async getOrdersByReportIds(report_ids: number[]) {
    return await this.prisma.order.findMany({
      where: {
        report_id: {
          in: report_ids,
        },
      },
      include: {
        Tasks: {
          where: {
            isVisible: true,
          },
          include: {
            TaskTimeRecords: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });
  }

  async create(data: WorkOrderType) {
    try {
     
      const result = await this.prisma.order.upsert({
        where: {
          report_id_tenantId: {
            report_id: data.report_id,
            tenantId: data.tenantId
          }
        },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
  
      return result;
    } catch (error) {
      console.error(`Error in create/update order:`, error);
      throw new InternalServerErrorException(`Failed to create/update order: ${error.message}`);
    }
  }

  async update(report_id: number, tenantId: number, data: UpdateWorkOrderDto) {
    try {
      // First, check if the order exists
      const existingOrder = await this.prisma.order.findUnique({
        where: {
          report_id_tenantId: { 
            tenantId,
            report_id
          }
        }
      });
  
      if (!existingOrder) {
        // Option 1: Throw a specific error
        throw new NotFoundException(`Order with report_id ${report_id} and tenantId ${tenantId} not found`);

      }
  
      // Proceed with update
      return await this.prisma.order.update({
        where: {
          report_id_tenantId: { 
            report_id,
            tenantId
          }
        },
        data: {
          ...data,
          completed_date:
            data.status && data.status === 'COMPLETED' ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('Order Update Error:', error);
      
      // More specific error handling
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2025') {
          throw new NotFoundException(`Order with report_id ${report_id} not found`);
        }
      }
  
      throw new InternalServerErrorException(`Failed to update order: ${error.message}`);
    }
  }

  async syncLog(tenantId: number, spentTime: string) {
    const getLog = await this.prisma.syncLog.findFirst();
    if (!getLog) {
      await this.prisma.syncLog.create({
        data: {
          tenantId,
          syncedDate: new Date(),
          spentTime,
        },
      });
    } else {
      await this.prisma.syncLog.update({
        where: {
          id: getLog.id,
        },
        data: {
          syncedDate: new Date(),
          spentTime,
        },
      });
    }
  }

  async getSyncLog() {
    return this.prisma.syncLog.findFirst();
  }

public async deleteOrder(report_id: number, tenantId: number) {
  const order = await this.prisma.order.findUnique({
    where: { report_id_tenantId: { report_id, tenantId } },
    include: {
      expenses: { include: { files: true } },
      JobNotes: { include: { files: true } },
      Tasks: { include: { TaskTimeRecords: true } },
      CrewAssignments: true,
      Workers: true,
      bidPhotos: true,
    },
  });

  if (!order) {
    throw new NotFoundException(`Order with report_id ${report_id} not found`);
  }

  // 1. Delete expenses (use ExpenseService → handles S3 + DB cleanup)
  for (const expense of order.expenses) {
    await this.expenseService.delete({ id: expense.id }, tenantId);
  }

  // 2. Delete job notes and their files
  for (const note of order.JobNotes) {
    for (const file of note.files) {
      const fileKey = new URL(file.fileUrl).pathname.slice(1); // extract key from URL
      await this.s3Service.deleteFile(fileKey);
      await this.prisma.jobNoteFile.delete({ where: { id: file.id } });
    }
    await this.prisma.jobNote.delete({ where: { id: note.id } });
  }

  // 3. Delete tasks and their time records
  for (const task of order.Tasks) {
    await this.prisma.taskTimeRecord.deleteMany({ where: { task_id: task.id } });
    await this.prisma.task.delete({ where: { id: task.id } });
  }

  // 4. Delete crew assignments
  await this.prisma.crewAssignment.deleteMany({
    where: { reportId: order.report_id, tenantId },
  });

  // 5. Delete worker assignments
  await this.prisma.assignment.deleteMany({
    where: { report_id: order.report_id, tenantId },
  });

  // 6. Delete bid photos
  for (const photo of order.bidPhotos) {
    const fileKey = new URL(photo.url).pathname.slice(1);
    await this.s3Service.deleteFile(fileKey);
    await this.prisma.bidPhoto.delete({ where: { id: photo.id } });
  }

  // 7. Finally delete the order
  return this.prisma.order.delete({
    where: { report_id_tenantId: { report_id, tenantId } },
  });
}
}