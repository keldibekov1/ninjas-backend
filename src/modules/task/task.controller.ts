import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  EndTaskDto,
  StartTaskDto,
  UpdateTaskAsCompletedDto,
  UpdateTaskCompletionStatusDto,
  UpdateTaskDto,
  PauseTaskDto,
  ResumeTaskDto,
} from './dto';
import { WorkerService } from '../worker/worker.service';
import { OrdersService } from '../orders/orders.service';
import { AuthGuard } from 'src/guards';

@Controller('task')
@UseGuards(AuthGuard)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly workerService: WorkerService,
    private readonly orderService: OrdersService,
  ) {}

  @Put('start')
  async startTask(@Body() data: StartTaskDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    }
    if (findTask.isCompleted) {
      throw new BadRequestException(
        `Task with id ${data.taskId} is already completed!`,
      );
    }

    const findWorker = await this.workerService.findById(
      tenantId,
      data.workerId,
    );
    if (!findWorker) {
      throw new NotFoundException(
        `Worker with id ${data.workerId} is not found!`,
      );
    }

    const startedTask = await this.taskService.startTask(
      tenantId,
      data.taskId,
      data.workerId,
      data.start_time,
    );

    return {
      message: 'Task started successfully!',
      info: startedTask,
    };
  }

  @Put('pause')
  async pauseTask(@Body() data: PauseTaskDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    }
    if (findTask.isCompleted) {
      throw new BadRequestException(
        `Task with id ${data.taskId} is already completed!`,
      );
    }

    const findWorker = await this.workerService.findById(
      tenantId,
      data.workerId,
    );
    if (!findWorker) {
      throw new NotFoundException(
        `Worker with id ${data.workerId} is not found!`,
      );
    }

    const paused = await this.taskService.pauseTask(
      tenantId,
      data.taskId,
      data.workerId,
      data.pause_time,
      data.reason,
    );

    return {
      message: 'Task paused successfully!',
      info: paused,
    };
  }

  @Put('resume')
  async resumeTask(@Body() data: ResumeTaskDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    }
    if (findTask.isCompleted) {
      throw new BadRequestException(
        `Task with id ${data.taskId} is already completed!`,
      );
    }

    const findWorker = await this.workerService.findById(
      tenantId,
      data.workerId,
    );
    if (!findWorker) {
      throw new NotFoundException(
        `Worker with id ${data.workerId} is not found!`,
      );
    }

    const resumed = await this.taskService.resumeTask(
      tenantId,
      data.taskId,
      data.workerId,
      data.start_time,
    );

    return {
      message: 'Task resumed successfully!',
      info: resumed,
    };
  }

  @Put('end')
  async endTask(@Body() data: EndTaskDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    }

    const findWorker = await this.workerService.findById(
      tenantId,
      data.workerId,
    );
    if (!findWorker) {
      throw new NotFoundException(
        `Worker with id ${data.workerId} is not found!`,
      );
    }

    await this.taskService.endTask(
      tenantId,
      data.taskId,
      data.workerId,
      data.end_time,
    );

    const { completed, all } = await this.taskService.getTasksCount(
      findTask.report_id,
    );
    const findOrder = await this.orderService.findByReportId(
      findTask.tenantId,
      findTask.report_id,
    );

    if (findOrder) {
      if (completed === all) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'COMPLETED',
          tenantId,
        });
      } else if (completed > 0) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'UNCOMPLETED',
          tenantId,
        });
      }
    }

    return {
      message: 'Task ended successfully!',
      info: {
        taskId: data.taskId,
        end_time: data.end_time,
      },
    };
  }

  @Post()
  async CreateTask(@Body() data: CreateTaskDto, @Req() req: Request) {
    const tenantId = data.tenantId ?? req['user']?.tenantId;

    if (tenantId == null) {
      throw new BadRequestException('Tenant ID is required');
    }

    data.tenantId = Number(tenantId);

    const findByReportId_Synced = await this.orderService.findByReportId(
      tenantId,
      data.report_id,
    );
    if (!findByReportId_Synced) {
      throw new BadRequestException(
        `work order with report_id ${data.report_id} not found!`,
      );
    }

    const calculatedTotal = data.qty * data.price;

    const createTask = await this.taskService.createCustom(
      { ...data, tenantId },
      calculatedTotal,
    );

    return {
      message: `Task is created successfully!`,
      info: createTask,
    };
  }

  @Put('status-complete')
  async UpdateTaskAsCompleteByWorker(
    @Body() data: UpdateTaskAsCompletedDto,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask)
      throw new NotFoundException(`task with id ${data.taskId} is not found!`);
    if (findTask.isCompleted)
      throw new BadRequestException(
        `task with id ${data.taskId} is already completed!`,
      );

    const findWorker = await this.workerService.findById(
      tenantId,
      data.workerId,
    );
    if (!findWorker)
      throw new NotFoundException(
        `worker with id ${data.workerId} is not found!`,
      );

    await this.taskService.updateTaskCompletionStatus(
      data.taskId,
      true,
      data.workerId,
    );

    await this.taskService.createTaskTimeRecord(
      tenantId,
      data.taskId,
      data.start_time,
      data.end_time,
      data.spent_time,
    );

    const { completed, all } = await this.taskService.getTasksCount(
      findTask.report_id,
    );

    const findOrder = await this.orderService.findByReportId(
      findTask.tenantId,
      findTask.report_id,
    );
    if (findOrder) {
      if (completed === all) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'COMPLETED',
          tenantId,
        });
      } else if (completed > 0) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'UNCOMPLETED',
          tenantId,
        });
      }
    }

    return {
      message: `Task status is changed to completed successfully!`,
      info: data,
    };
  }

  @Put('status-change')
  async UpdateTaskCompletionStatusByAdmin(
    @Body() data: UpdateTaskCompletionStatusDto,
  ) {
    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask)
      throw new NotFoundException(`task with id ${data.taskId} is not found!`);
    await this.taskService.updateTaskCompletionStatus(
      data.taskId,
      data.isCompleted,
    );

    return {
      message: 'Task status is changed successfully!',
    };
  }

  @Put(':taskId')
  async UpdateTaskDto(
    @Param('taskId') taskId: string,
    @Body() data: UpdateTaskDto,
  ) {
    const findTaskById = await this.taskService.findById(+taskId);
    if (!findTaskById)
      throw new NotFoundException(`task with id ${taskId} is not found!`);

    const updateTask = await this.taskService.update(+taskId, data);

    return {
      message: `Task info is updated successfully!`,
      info: updateTask,
    };
  }

  @Delete(':taskId')
  async DeleteTask(@Param('taskId') taskId: string) {
    const findTask = await this.taskService.findById(+taskId);
    if (!findTask)
      throw new BadRequestException(`task with Id ${taskId} is not found!`);

    await this.taskService.deleteTask(+taskId);

    return {
      message: `Task is deleted successfully!`,
    };
  }
}
