import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignCrewOrderDto, AssignOrderDto } from './dto';
import { WorkerService } from '../worker/worker.service';
import { CrewService } from '../crew/crew.service';
import { OrdersService } from '../orders/orders.service';
import { AuthGuard } from 'src/guards';

@Controller('assignment')
@UseGuards(AuthGuard)
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly workerService: WorkerService,
    private readonly crewService: CrewService,
    private readonly orderService: OrdersService,
  ) {}

  @Post('crew')
  async assignOrdersToCrew(
    @Body() data: AssignCrewOrderDto, 
    @Req() req: Request
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate crew exists
    await this.crewService.getCrewById(data.crewId, tenantId);

    const assignments = [];
    for (const reportId of data.reportIds) {
      const assignment = await this.assignmentService.assignCrewToOrder(
        tenantId, 
        data.crewId, 
        parseInt(reportId, 10)
      );
      assignments.push(assignment);
    }

    return {
      message: 'Orders assigned to crew successfully',
      crewId: data.crewId,
      assignments
    };
  }

  @Post()
  async AssignOrders(@Body() data: AssignOrderDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    
    const findWorkerById = await this.workerService.findById(tenantId, data.workerId);
    if (!findWorkerById) {
      throw new NotFoundException(`Worker with id ${data.workerId} not found!`);
    }

    const assignedOrders = [];
    const skippedOrders = [];

    for (const report_id of data.report_ids) {
      // Convert report_id to number
      const reportIdNum = parseInt(report_id, 10);

      const findByWorkerAndReportId =
        await this.assignmentService.findByWorkerAndReportId(
          data.workerId,
          reportIdNum, // Use number here
        );

      if (findByWorkerAndReportId) {
        // Skip if already assigned instead of throwing error
        skippedOrders.push(report_id);
        continue;
      }

      const findOrder = await this.orderService.findByReportId(tenantId, reportIdNum);
      if (!findOrder) {
        throw new BadRequestException(
          `Order with report_id ${report_id} not found!`,
        );
      }

      // assign order - use reportIdNum
      await this.assignmentService.assignOrder(tenantId, data.workerId, reportIdNum);
      assignedOrders.push(report_id);
    }

    return {
      message: `Orders assignment completed`,
      worker_id: data.workerId,
      assignedOrders,
      skippedOrders: skippedOrders.length > 0 ? skippedOrders : undefined,
      ...(skippedOrders.length > 0 && {
        note: `${skippedOrders.length} order(s) were skipped as they were already assigned to this worker`
      })
    };
  }

  @Delete(':assignmentId')
  async DeleteAssignment(@Param('assignmentId') assignmentId: string) {
    const findAssignment = await this.assignmentService.findById(+assignmentId);
    if (!findAssignment) {
      throw new BadRequestException(
        `Assignment with Id ${assignmentId} is not found!`,
      );
    }

    await this.assignmentService.delete(+assignmentId);

    return {
      message: `Worker is unassigned from this order successfully!`,
    };
  }

  @Delete('crew/:assignmentId')
  async DeleteCrewAssignment(@Param('assignmentId') assignmentId: string) {
    const findAssignment = await this.assignmentService.findCrewAssignmentById(+assignmentId);
    if (!findAssignment) {
      throw new BadRequestException(
        `Crew assignment with Id ${assignmentId} is not found!`,
      );
    }

    await this.assignmentService.deleteCrewAssignment(+assignmentId);

    return {
      message: `Crew is unassigned from this order successfully!`,
    };
  }
}