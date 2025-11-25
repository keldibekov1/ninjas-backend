import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateExpenseDto, DeleteExpenseDto, FilterExpensesQueryDto, UpdateExpenseDto } from './dto';
import { metaData, startIndex } from '../../utils/pagination';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  public async create(
    data: CreateExpenseDto,
    files: Express.Multer.File[],
    addedBy: 'ADMIN' | 'TELEGRAM_BOT' = 'TELEGRAM_BOT',
    tenantId: number,
  ) {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const key = `expenses/${tenantId}/${Date.now()}-${file.originalname}`;
        const fileUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
        return {
          fileName: file.originalname,
          fileUrl,
          fileKey: key // Store the S3 key if needed
        };
      })
    );

    return this.prisma.expense.create({
      data: {
        workerId: data.workerId,
        action: data.action,
        comment: data.comment,
        amount: data.amount,
        date: data?.date,
        addedBy,
        tenantId,
        categoryId: data.categoryId,
        orderId: data.orderId,
        files: {
          create: uploadedFiles
        }

      },
    });
  }

  public getLastExpenseByWorkerId(workerId: number) {
    return this.prisma.expense.findFirst({
      where: {
        workerId,
        action: 'SPENDING',
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  public async getExpenses(query: FilterExpensesQueryDto, tenantId: number | null) {
    const { workerId, from_date, to_date, page = 1, limit = 10, categoryId } = query;
  
    const baseWhereClause: any = {
      categoryId,
      ...(workerId && { workerId }),
      ...(from_date || to_date) && {
        date: {
          ...(from_date && { gte: from_date }),
          ...(to_date && { lte: to_date })
        }
      }
    };

    // Add tenantId filter only if tenantId is provided (not null)
    if (tenantId !== null) {
      baseWhereClause.tenantId = tenantId;
    }
  
    const expenses = await this.prisma.expense.findMany({
      where: baseWhereClause,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            wo_number: true,
          },
        },
        files: true, // Include files
      },
      orderBy: {
        id: 'desc',
      },
      take: limit,
      skip: startIndex(page, limit),
    });
  
    const spendings = await this.prisma.expense.aggregate({
      where: {
        ...baseWhereClause,
        action: 'SPENDING',
      },
      _sum: {
        amount: true,
      },
    });
  
    const penalties = await this.prisma.expense.aggregate({
      where: {
        ...baseWhereClause,
        action: 'PENALTY',
      },
      _sum: {
        amount: true,
      },
    });
  
    const meta = metaData(
      page,
      limit,
      await this.prisma.expense.count({
        where: baseWhereClause,
      }),
      'totalExpenses',
    );
  
    // Remove sensitive information and format the response
    const sanitizedExpenses = expenses.map(({ workerId, tenantId, ...expense }) => ({
      ...expense,
      categoryName: expense.category?.name,
      woNumber: expense.order?.wo_number,
      // Add file information 
      files: expense.files.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl
      }))
    }));
  
    return {
      meta,
      stats: {
        total: (penalties._sum.amount ?? 0) + (spendings._sum.amount ?? 0),
        spendings: spendings._sum.amount ?? 0,
        penalties: penalties._sum.amount ?? 0,
      },
      expenses: sanitizedExpenses,
    };
  }

  public async update(data: UpdateExpenseDto, files?: Express.Multer.File[], tenantId?: number | null) {
    // Build where clause for finding expense
    const whereClause: any = { id: data.id };
    
    // Add tenant filter if tenantId is provided (security check)
    if (tenantId !== null && tenantId !== undefined) {
      whereClause.tenantId = tenantId;
    }

    const expense = await this.prisma.expense.findUnique({
      where: whereClause,
      include: { files: true }
    });

    if (!expense) {
      if (tenantId !== null && tenantId !== undefined) {
        throw new UnauthorizedException(`Expense with id ${data.id} not found in your organization`);
      }
      throw new NotFoundException(`Expense with id ${data.id} not found!`);
    }

    // Optional: Delete existing files if needed
    if (data.deleteFileIds && data.deleteFileIds.length > 0) {
      await Promise.all(
        data.deleteFileIds.map(async (fileId) => {
          const fileToDelete = await this.prisma.expenseFile.findUnique({
            where: { id: fileId }
          });
          
          if (fileToDelete) {
            await this.s3Service.deleteFile(new URL(fileToDelete.fileUrl).pathname);
            await this.prisma.expenseFile.delete({
              where: { id: fileId }
            });
          }
        })
      );
    }

    // Upload new files
    const uploadedFiles = files ? await Promise.all(
      files.map(async (file) => {
        const key = `expenses/${expense.tenantId}/${Date.now()}-${file.originalname}`;
        const fileUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
        return {
          fileName: file.originalname,
          fileUrl,
          fileKey: key // Store the S3 key if needed
        };
      })
    ) : [];

    return this.prisma.expense.update({
      where: { id: data.id },
      data: {
        workerId: data.workerId,
        action: data.action,
        comment: data.comment,
        amount: data.amount,
        date: data?.date,
        categoryId: data.categoryId,
        files: {
          create: uploadedFiles
        }
      },
    });
  }

  public async delete(data: DeleteExpenseDto, tenantId?: number | null) {
    // Build where clause for finding expense
    const whereClause: any = { id: data.id };
    
    // Add tenant filter if tenantId is provided (security check)
    if (tenantId !== null && tenantId !== undefined) {
      whereClause.tenantId = tenantId;
    }

    const expense = await this.prisma.expense.findUnique({
      where: whereClause,
      include: { files: true }
    });

    if (!expense) {
      if (tenantId !== null && tenantId !== undefined) {
        throw new UnauthorizedException(`Expense with id ${data.id} not found in your organization`);
      }
      throw new NotFoundException(`Expense with id ${data.id} not found!`);
    }

    // Delete all associated files from S3 + DB
    await Promise.all(
      expense.files.map(async (file) => {
        await this.s3Service.deleteFile(file.fileKey); // ✅ use key directly
        await this.prisma.expenseFile.delete({ where: { id: file.id } });
      })
    );

    return this.prisma.expense.delete({
      where: { id: data.id },
    });
  }
}