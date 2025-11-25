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
  async startTask(
    @Body() data: StartTaskDto,
    @Req() req: Request
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    } else if (findTask.isCompleted) {
      throw new BadRequestException(`Task with id ${data.taskId} is already completed!`);
    }

    const findWorker = await this.workerService.findById(tenantId, data.workerId);
    if (!findWorker) {
      throw new NotFoundException(`Worker with id ${data.workerId} is not found!`);
    }

    // Start the task
    const startedTask = await this.taskService.startTask(
      tenantId,
      data.taskId,
      data.workerId,
      data.start_time
    );

    return {
      message: 'Task started successfully!',
      info: startedTask
    };
  }

  @Put('end')
  async endTask(
    @Body() data: EndTaskDto,
    @Req() req: Request
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`Task with id ${data.taskId} is not found!`);
    }

    // Get the active time record for this task
    const activeTimeRecord = await this.taskService.getActiveTimeRecord(data.taskId);
    if (!activeTimeRecord) {
      throw new BadRequestException('No active task found to end');
    }

    // Calculate spent time
    const spent_time = data.end_time - activeTimeRecord.start_time;

    // End the task and update completion status
    await this.taskService.endTask(
      data.taskId,
      data.workerId,
      data.end_time,
      spent_time
    );

    // Update order status based on task completion
    const { completed, all } = await this.taskService.getTasksCount(findTask.report_id);
    const findOrder = await this.orderService.findByReportId(findTask.tenantId, findTask.report_id);
    
    if (findOrder) {
      if (completed === all) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'COMPLETED',
          tenantId
        });
      } else if (completed > 0) {
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'UNCOMPLETED',
          tenantId
        });
      }
    }

    return {
      message: 'Task ended successfully!',
      info: {
        taskId: data.taskId,
        end_time: data.end_time,
        spent_time
      }
    };
  }

  @Post()
async CreateTask(
  @Body() data: CreateTaskDto,  
  @Req() req: Request
) {
  // Attempt to get tenantId from data or user object
  const tenantId = data.tenantId ?? req['user']?.tenantId;

  if (tenantId == null) {
    throw new BadRequestException('Tenant ID is required');
  }

  // Ensure data.tenantId is set with the retrieved tenantId
  data.tenantId = Number(tenantId);

  
    const findByReportId_Synced = await this.orderService.findByReportId(
      tenantId,
      data.report_id
    );
    if (!findByReportId_Synced) {
      throw new BadRequestException(
        `work order with report_id ${data.report_id} not found!`,
      );
    }
  
    const calculatedTotal = data.qty * data.price;
  
    // create task with tenantId
    const createTask = await this.taskService.createCustom(
      {
        ...data,
        tenantId 
      },
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
    @Req() req: Request
  ) {
    try {
      // Existing logic
      console.log('Received data:', data); // Log incoming data
  
      // Validate input data types
      if (!data.taskId || !data.workerId || !data.start_time || !data.end_time) {
        throw new BadRequestException('Invalid input data');
      }
    } catch (error) {
      console.error('Task Completion Error:', error);
    }

    // Extract tenantId from the authenticated user
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const findTask = await this.taskService.findById(+data.taskId);
    if (!findTask) {
      throw new NotFoundException(`task with id ${data.taskId} is not found!`);
    } else if (findTask.isCompleted) {
      throw new BadRequestException(
        `task with id ${data.taskId} is already completed!`,
      );
    }
    
    const findWorker = await this.workerService.findById(tenantId, data.workerId);
    if (!findWorker) {
      throw new NotFoundException(
        `worker with id ${data.workerId} is not found!`,
      );
    }

    // update task as completed
    await this.taskService.updateTaskCompletionStatus(
      data.taskId,
      true,
      data.workerId,
    );

    // create task time record
    await this.taskService.createTaskTimeRecord(
      tenantId,
      data.taskId,
      data.start_time,
      data.end_time,
      data.spent_time,
    );

    // Get updated task counts
    const { completed, all } = await this.taskService.getTasksCount(
      findTask.report_id,
    );

    const findOrder = await this.orderService.findByReportId(findTask.tenantId, findTask.report_id);
    if (findOrder) {
      if (completed === all) {
        // If all tasks are completed, mark order as COMPLETED
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'COMPLETED',
          tenantId
        });
      } else if (completed > 0) {
        // If any tasks are completed but not all, mark as UNCOMPLETED
        await this.orderService.update(findTask.report_id, tenantId, {
          status: 'UNCOMPLETED',
          tenantId
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
    if (!findTask) {
      throw new NotFoundException(`task with id ${data.taskId} is not found!`);
    }

    if (!findTask.isCompleted && data.isCompleted) {
      await this.taskService.updateTaskCompletionStatus(
        data.taskId,
        data.isCompleted,
      );

      // Get updated task counts
      const { completed, all } = await this.taskService.getTasksCount(
        findTask.report_id,
      );

      const findOrder = await this.orderService.findByReportId(findTask.tenantId, findTask.report_id);
      if (findOrder) {
        if (completed === all) {
          // If all tasks are completed, mark order as COMPLETED
          await this.orderService.update(findTask.report_id, findTask.tenantId, {
            status: 'COMPLETED',
            tenantId: findTask.tenantId
          });
        } else if (completed > 0) {
          // If any tasks are completed but not all, mark as UNCOMPLETED
          await this.orderService.update(findTask.report_id, findTask.tenantId, {
            status: 'UNCOMPLETED',
            tenantId: findTask.tenantId
          });
        }
      }
    }

    if (!findTask.isCompleted && !data.isCompleted) {
      return {
        message: 'Task status is changed successfully!',
      };
    }

    // update task status
    await this.taskService.updateTaskCompletionStatus(
      data.taskId,
      data.isCompleted,
    );

    if (findTask.isCompleted && !data.isCompleted) {
      // Get updated task counts after uncompleting a task
      const { completed, all } = await this.taskService.getTasksCount(
        findTask.report_id,
      );

      const findOrder = await this.orderService.findByReportId(findTask.tenantId, findTask.report_id);
      if (findOrder) {
        if (completed > 0 && completed < all) {
          // If some tasks are still completed but not all, keep as UNCOMPLETED
          await this.orderService.update(findTask.tenantId, findTask.report_id, {
            status: 'UNCOMPLETED',
            tenantId: findTask.tenantId
          });
        }
      }
    }

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
    if (!findTaskById) {
      throw new NotFoundException(`task with id ${taskId} is not found!`);
    }

    // update task
    const updateTask = await this.taskService.update(+taskId, data);

    return {
      message: `Task info is updated successfully!`,
      info: updateTask,
    };
  }

  @Delete(':taskId')
  async DeleteTask(@Param('taskId') taskId: string) {
    const findTask = await this.taskService.findById(+taskId);
    if (!findTask) {
      throw new BadRequestException(`task with Id ${taskId} is not found!`);
    }

    // delete task
    await this.taskService.deleteTask(+taskId);

    return {
      message: `Task is deleted successfully!`,
    };
  }
}