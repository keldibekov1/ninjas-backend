import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskType } from './types';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  private getRunningRecord(tenantId: number, taskId: number, workerId: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: {
        tenantId,
        task_id: taskId,
        worker_id: workerId,
        status: 'RUNNING',
        end_time: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ oxirgi record (resume uchun)
  private getLastRecord(tenantId: number, taskId: number, workerId: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: {
        tenantId,
        task_id: taskId,
        worker_id: workerId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async startTask(
    tenantId: number,
    task_id: number,
    worker_id: number,
    start_time: number,
  ) {
    const running = await this.getRunningRecord(tenantId, task_id, worker_id);
    if (running) throw new BadRequestException('Task already running');

    return this.prisma.taskTimeRecord.create({
      data: {
        tenantId,
        task_id,
        worker_id,
        start_time: Math.trunc(start_time),
        status: 'RUNNING',
        pause_reason: null,
        end_time: null,
        spent_time: 0,
      },
      include: { task: true },
    });
  }

  public async pauseTask(
    tenantId: number,
    taskId: number,
    workerId: number,
    pause_time: number,
    reason?: string,
  ) {
    const running = await this.getRunningRecord(tenantId, taskId, workerId);
    if (!running) throw new BadRequestException('No running task to pause');

    const end = Math.trunc(pause_time);
    const start = Math.trunc(running.start_time);

    if (end < start)
      throw new BadRequestException(
        'pause_time cannot be earlier than start_time',
      );

    const spent = end - start;

    return this.prisma.taskTimeRecord.update({
      where: { id: running.id },
      data: {
        end_time: end,
        spent_time: spent,
        status: 'PAUSED',
        pause_reason: reason ?? null,
      },
    });
  }

  public async resumeTask(
    tenantId: number,
    taskId: number,
    workerId: number,
    start_time: number,
  ) {
    const running = await this.getRunningRecord(tenantId, taskId, workerId);
    if (running) {
      throw new BadRequestException('Task already running');
    }

    const last = await this.getLastRecord(tenantId, taskId, workerId);
    if (!last) {
      throw new BadRequestException(
        'No previous record found. Use start first.',
      );
    }

    if (last.status === 'COMPLETED') {
      throw new BadRequestException('Task already completed');
    }

    return this.prisma.taskTimeRecord.create({
      data: {
        tenantId,
        task_id: taskId,
        worker_id: workerId,
        start_time: Math.trunc(start_time),
        status: 'RUNNING',
        pause_reason: null,
        end_time: null,
        spent_time: null,
      },
      include: { task: true },
    });
  }

  public async endTask(
    tenantId: number,
    taskId: number,
    workerId: number,
    end_time: number,
  ) {
    const running = await this.getRunningRecord(tenantId, taskId, workerId);
    if (!running) throw new BadRequestException('No running task found to end');

    const end = Math.trunc(end_time);
    const start = Math.trunc(running.start_time);
    if (end < start)
      throw new BadRequestException(
        'end_time cannot be earlier than start_time',
      );

    const spent = end - start;

    await this.prisma.taskTimeRecord.update({
      where: { id: running.id },
      data: { end_time: end, spent_time: spent, status: 'COMPLETED' },
    });

    return this.updateTaskCompletionStatus(taskId, true, workerId);
  }

  public getActiveTimeRecord(task_id: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: {
        task_id,
        end_time: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createCustom(data: CreateTaskDto, total: number) {
    return this.prisma.task.create({
      data: { ...data, total },
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
        status: 'COMPLETED',
      },
      include: { task: true },
    });
  }

  public findById(id: number) {
    return this.prisma.task.findUnique({ where: { id } });
  }

  public getAll() {
    return this.prisma.task.findMany({
      include: { TaskTimeRecords: true },
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

    return { completed, uncompleted, all };
  }

  public update(taskId: number, data: UpdateTaskDto) {
    return this.prisma.task.update({
      where: { id: taskId },
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
      completedDate: null,
    };

    if (isCompleted) data.completedDate = new Date();

    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }

  public getLastTaskTimeRecordByWorkerId(worker_id: number) {
    return this.prisma.taskTimeRecord.findFirst({
      where: { worker_id },
      orderBy: { createdAt: 'desc' },
    });
  }

  public deleteTask(taskId: number) {
    return this.prisma.task.delete({ where: { id: taskId } });
  }
}
