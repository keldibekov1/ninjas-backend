import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskType } from './types';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { Tenant } from 'firebase-admin/lib/auth/tenant';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}


  public async startTask(
    tenantId: number,
    task_id: number,
    worker_id: number,
    start_time: number
  ) {
    // Create a new time record with only start time
    return this.prisma.taskTimeRecord.create({
      data: {
        tenantId,
        task_id,
        worker_id,
        start_time,
        // end_time and spent_time will be null until task is ended
      },
      include: {
        task: true
      }
    });
  }

  public async endTask(
    task_id: number,
    worker_id: number,
    end_time: number,
    spent_time: number
  ) {
    // Update the existing time record with end time and spent time
    await this.prisma.taskTimeRecord.updateMany({
      where: {
        task_id,
        worker_id,
        end_time: null // Only update the active (unfinished) record
      },
      data: {
        end_time,
        spent_time
      }
    });

    // Update task completion status
    return this.updateTaskCompletionStatus(
      task_id,
      true,
      worker_id
    );
  }

  public getActiveTimeRecord(task_id: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: {
        task_id,
        end_time: null // Find the record that hasn't been ended yet
      }
    });
  }

  public async createCustom(
    data: CreateTaskDto, 
    total: number
  ) {
    return this.prisma.task.create({
      data: {
        ...data,
        total
      },
    });
  }

  public async create(tenantId: number, report_id: number, data: TaskType[]) {
    for (const task of data) {
      await this.prisma.task.create({
        data: {
          report_id,
          tenantId,
          desc: task.desc,
          qty: task.qty,
          price: task.price,
          total: task.total,
          add: task.add,
        },
      });
    }
  }

  public createTaskTimeRecord(
    tenantId: number,
    task_id: number,
    start_time: number,
    end_time: number,
    spent_time: number,
  ) {
    return this.prisma.taskTimeRecord.create({
      data: {
        tenantId,
        task_id,
        start_time,
        end_time,
        spent_time,
      },
      // Optional: include related data in the response
      include: {
        task: true      },
    });
  }

  public findById(id: number) {
    return this.prisma.task.findUnique({
      where: {
        id,
      },
    });
  }

  public getAll() {
    return this.prisma.task.findMany({
      include: {
        TaskTimeRecords: true,
      },
    });
  }

  public async getTasksCount(report_id: number) {
    const completed = await this.prisma.task.count({
      where: { report_id, isCompleted: true },
    });
    const uncompleted = await this.prisma.task.count({
      where: { report_id, isCompleted: false },
    });
    const all = await this.prisma.task.count({ where: { report_id } });

    return {
      completed,
      uncompleted,
      all,
    };
  }

  public update(taskId: number, data: UpdateTaskDto) {
    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data,
    });
  }

  public async updateTaskCompletionStatus(
    taskId: number,
    isCompleted: boolean,
    workerId?: number,
  ) {
    const data: any = {
      isCompleted,
      completedWorker: workerId,
      completedDate: null, // Reset completedDate when task is uncompleted
    };

    if (isCompleted) {
      // Set current UTC time when task is completed
      data.completedDate = new Date();
    }

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data,
    });
  }

  public getLastTaskTimeRecordByWorkerId(worker_id: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: {
        worker_id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public deleteTask(taskId: number) {
    return this.prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  }
}
