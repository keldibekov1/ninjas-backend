import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiPpwService } from '../api-ppw/api-ppw.service';
import { PrimaryOrdersListType, SingleOrderType } from '../api-ppw/types';
import { TaskService } from '../task/task.service';
import { findMostSuitableDescription, formatTime, isSimilar } from 'src/utils';
import { FilerOrdersQueryDto, UpdateWorkOrderDto } from './dto';
import { Permission } from 'src/decorators';
import { AuthGuard } from '../../guards';
import { WorkerService } from '../worker/worker.service';
import { AssignmentService } from '../assignment/assignment.service';
import { JobNotesService } from '../job-notes/job-notes.service';
import { PrimaryJobNotesType } from '../job-notes/types';
import { delay, getCoordinates } from 'src/utils/coordinates';
import { WorkOrderType } from './types';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly apiPpwService: ApiPpwService,
    private readonly taskService: TaskService,
    private readonly workerService: WorkerService,
    private readonly assignmentService: AssignmentService,
    private readonly jobNotesService: JobNotesService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  @Permission('WORK_ORDER', ['READ'])
  async GetOrders(@Query() query: FilerOrdersQueryDto, @Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const syncedOrders = await this.ordersService.getOrders(query, tenantId);

    return {
      message: 'Ok',
      isInitial: false,
      orders: syncedOrders,
    };
  }

  @Get('work-types')
  @UseGuards(AuthGuard)
  async GetWorkTypes(@Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const workTypes = await this.ordersService.getWorkTypes(tenantId);

    return {
      message: 'Work types retrieved successfully',
      work_types: workTypes,
    };
  }

  @Get('cities')
  @UseGuards(AuthGuard)
  async GetCities(@Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const cities = await this.ordersService.getCities(tenantId);

    return {
      message: 'Cities retrieved successfully',
      cities,
    };
  }

  @Get('states')
  @UseGuards(AuthGuard)
  async GetStates(@Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const states = await this.ordersService.getStates(tenantId);

    return {
      message: 'States retrieved successfully',
      states,
    };
  }

  @Get('sync/status')
  @UseGuards(AuthGuard)
  async getSyncStatus(@Req() req: Request) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    const status = await this.ordersService.getSyncStatus(tenantId);
    return status;
  }

  @Get('sync-log')
  async GetSyncOrdersLog() {
    const syncLog = await this.ordersService.getSyncLog();
    if (syncLog) {
      return {
        message: `Ok`,
        log: syncLog,
      };
    } else {
      return {
        message: 'OK',
        log: null,
      };
    }
  }

  @Get('worker/:workerId')
  async GetWorkerOrders(
    @Param('workerId') workerId: number,
    @Req() req: Request,
  ) {
    // Extract tenantId from the authenticated user
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const findWorkerById = await this.workerService.findById(
      tenantId,
      workerId,
    );
    if (!findWorkerById) {
      throw new BadRequestException(`worker with id ${workerId} not found!`);
    }

    const getWorkerAssignments =
      await this.assignmentService.getWorkerAssignments(+workerId, tenantId);

    const reportIds = getWorkerAssignments.map((assignment) =>
      'report_id' in assignment ? assignment.report_id : assignment.reportId,
    );

    const getWorkerAssignedOrders =
      await this.ordersService.getOrdersByReportIds(reportIds);

    return {
      message: `Worker assigned orders list is retrieved successfully!`,
      workerId: +workerId,
      orders: getWorkerAssignedOrders.sort((a, b) => b.report_id - a.report_id),
    };
  }

  @Get(':report_id')
  @UseGuards(AuthGuard)
  async GetSingleOrder(
    @Param('report_id') report_id: string,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const order = await this.ordersService.findByReportId(
      tenantId,
      +report_id,
      true,
      true,
    );

    if (!order) {
      throw new BadRequestException(`Order with id ${report_id} not found!`);
    }

    // Destructure the needed fields
    const {
      JobNotes: job_notes,
      Tasks: tasks,
      assigned_workers,
      ...orderInfo
    } = order;

    return {
      message: `Workorder info is retrieved successfully!`,
      info: {
        ...orderInfo,
        assigned_workers,
        tasks,
        job_notes,
      },
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  async CreateWorkOrder(
    @Body() data: Omit<WorkOrderType, 'report_id'>,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      // Check if we have address details to fetch coordinates
      let coordinates = null;
      if (data.address && data.city && data.state) {
        try {
          coordinates = await getCoordinates(
            data.address,
            data.city,
            data.state,
          );
        } catch (coordError) {
          console.error('Error fetching coordinates:', coordError);
          // Continue without coordinates if fetching fails
        }
      }

      // Create the work order with coordinates
      const newOrder = await this.ordersService.createManualOrder({
        ...data,
        coordinates,
        tenantId,
      });

      return {
        message: 'Work order created successfully',
        order: newOrder,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

@Post('sync')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard)
async SyncOrders(@Req() req: Request) {
  const tenantId = req['user']?.tenantId;
  if (!tenantId) throw new BadRequestException('Tenant ID is required');

  const startTime = new Date();

  const beforeCount = await this.ordersService.countByTenant(tenantId);
  console.log('DB orders before:', beforeCount);

  const PrimaryOrdersAPI = await this.apiPpwService.getAll(tenantId);
  const all_orders_primary: PrimaryOrdersListType = PrimaryOrdersAPI.data;

  const allAny = all_orders_primary as any;

  if (!allAny?.success || allAny?.error || allAny?.auth_error) {
    throw new BadRequestException(allAny?.return_error_msg || 'PPW getAll failed');
  }

  const tasksFromDB = await this.taskService.getAll();

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // ✅ MUHIM: result_data ni any’dan oling
  const list: any[] = allAny?.result_data || [];
  console.log('PPW orders count:', list.length);

  for (const workOrder of list) {
    try {
      console.log('SYNC report_id:', workOrder.report_id);

      const singleOrderApi = await this.apiPpwService.getOne(
        tenantId,
        workOrder.report_id,
      );

      const primaryOrder: SingleOrderType = singleOrderApi.data;
      const primaryAny = primaryOrder as any;

      if (!primaryAny?.success || primaryAny?.error || primaryAny?.auth_error) {
        throw new Error(primaryAny?.return_error_msg || 'PPW getOne failed');
      }

      // ✅ details ni any qilib olamiz (type xatolar bo‘lmasin)
      const details: any = primaryAny.result_data;
      workOrder.details = details;

      // Coordinates
      let coordinates: string | null = null;
      if (details?.address && details?.city && details?.state) {
        try {
          coordinates = await getCoordinates(details.address, details.city, details.state);
        } catch (e) {
          console.log('getCoordinates error:', details.address, details.city, details.state);
        }
        await delay(1000);
      }

      const findByReportId = await this.ordersService.findByReportId(
        tenantId,
        workOrder.report_id,
      );
      console.log('exists:', !!findByReportId);

      // ✅ key_values type fix
      const keyValues: Record<string, any> = details?.key_values || {};

      const payload = {
        address: details?.address ?? null,
        city: details?.city ?? null,
        zip: details?.zip ?? null,
        coordinates: coordinates ?? (findByReportId?.coordinates ?? null),

        broker_company: details?.broker_company ?? null,
        broker_email: details?.broker_email ?? null,

        autoimport_client_orig: keyValues.autoimport_client_orig ?? null,
        autoimport_userid: keyValues.autoimport_userid ?? null,
        bg_checkin_provider: keyValues.bg_checkin_provider ?? null,

        broker_name: details?.broker_name ?? null,
        broker_phone: details?.broker_phone ?? null,
        comments: details?.comments ?? null,
        client_company_alias: details?.client_company_alias ?? null,
        cust_text: String(details?.cust_text ?? ''),
        date_due: details?.date_due ?? null,
        has_foh: details?.has_foh ?? null,
        date_received: details?.date_received ?? null,
        import_user_id: details?.import_user_id ?? null,
        key_code: details?.key_code ?? null,
        loan_number: details?.loan_number ?? null,
        loan_type_other: details?.loan_type_other ?? null,
        lock_code: details?.lock_code ?? null,
        lot_size: details?.lot_size ?? null,
        mcs_woid: keyValues.mcs_woid ?? null,
        mortgage_name: details?.mortgage_name ?? null,

        org_wo_num: workOrder?.org_wo_num ?? null,
        start_date: details?.start_date ?? null,
        state: details?.state ?? null,
        ppw_report_id: details?.ppw_report_id ?? null,

        wo_number: workOrder?.wo_number ?? details?.wo_number ?? null,
        wo_number_orig: keyValues.wo_number_orig ?? null,
        wo_status: details?.wo_status ?? workOrder?.wo_status ?? null,
        wo_photo_ts_format: keyValues.wo_photo_ts_format ?? null,
        work_type_alias: details?.work_type_alias ?? null,

        tenantId,
      };

      if (findByReportId) {
        await this.ordersService.update(workOrder.report_id, tenantId, payload as any);
        updatedCount++;
      } else {
        await this.ordersService.create({
          report_id: workOrder.report_id,
          ...payload,
        } as any);
        createdCount++;

        // create tasks related to report_id
        await this.taskService.create(
          tenantId,
          workOrder.report_id,
          details?.line_items ?? [],
        );

        // create job notes
        const jobNotesPrimary = await this.apiPpwService.getJobNotes(
          tenantId,
          workOrder.report_id,
        );

        const jobNotesAny = jobNotesPrimary?.data as any;
        const notesData: any[] = jobNotesAny?.result_data ?? [];

        if (notesData.length) {
          for (const note of notesData) {
            await this.jobNotesService.create({
              report_id: workOrder.report_id,
              note_text: note.note_text,
              tenantId,
            });
          }
        }
      }

      // tasks update
      for (const line_item_task of (details?.line_items ?? []) as any[]) {
        const isExistedTask = tasksFromDB.find(
          (item) =>
            item.report_id === workOrder.report_id &&
            item.desc === line_item_task.desc,
        );

        if (!isExistedTask) {
          const possibleDataTask = tasksFromDB.find((item) => {
            const normalized = (item.desc || '').replace(/\s/g, '').toLowerCase();

            const best = findMostSuitableDescription(
              line_item_task.desc,
              tasksFromDB
                .filter((t) => t.report_id === workOrder.report_id)
                .map((t) => t.desc),
            )
              .replace(/\s/g, '')
              .toLowerCase();

            return item.report_id === workOrder.report_id && isSimilar(normalized, best);
          });

          if (possibleDataTask) {
            await this.taskService.update(possibleDataTask.id, {
              desc: line_item_task.desc,
              add: line_item_task.add,
              qty: line_item_task.qty,
              price: line_item_task.price,
              total: line_item_task.total,
              tenantId,
            });
          }
        } else {
          await this.taskService.update(isExistedTask.id, {
            desc: line_item_task.desc,
            add: line_item_task.add,
            qty: line_item_task.qty,
            price: line_item_task.price,
            total: line_item_task.total,
            tenantId,
          });
        }
      }
    } catch (e: any) {
      errorCount++;
      console.error('SYNC ERROR report_id:', workOrder?.report_id, e?.message);
    }
  }

  // Refresh coordinates for existing orders with missing data
  const existingOrdersWithoutCoordinates =
    await this.ordersService.getOrdersWithoutCoordinates(tenantId);

  for (const order of existingOrdersWithoutCoordinates) {
    const { address, city, state } = order;

    try {
      const coordinates = await getCoordinates(address, city, state);
      if (coordinates) {
        await this.ordersService.updateCoordinates(order.report_id, tenantId, coordinates);
      }
    } catch (error) {
      console.error(`Error updating coordinates for order ${order.report_id}:`, error);
    }

    await delay(1000);
  }

  const endTime = new Date();
  const elapsedTime = endTime.getTime() - startTime.getTime();
  const formattedTime = formatTime(elapsedTime);

  await this.ordersService.syncLog(tenantId, formattedTime);

  const afterCount = await this.ordersService.countByTenant(tenantId);
  console.log('DB orders after:', afterCount);

  return {
    message: 'Orders is synced successfully!',
    spentTime: formattedTime,
    stats: {
      beforeCount,
      afterCount,
      createdCount,
      updatedCount,
      errorCount,
    },
  };
}


  @Put(':report_id')
  @UseGuards(AuthGuard)
  async UpdateWorkOrder(
    @Param('report_id') report_id: string,
    @Body() data: UpdateWorkOrderDto,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const findWorkOrder = await this.ordersService.findByReportId(
      tenantId,
      +report_id,
    );
    if (!findWorkOrder) {
      throw new BadRequestException(
        `order with report_id ${report_id} not found!`,
      );
    }

    // Fix the parameter order here
    const updateOrder = await this.ordersService.update(
      +report_id,
      tenantId,
      data,
    );

    return {
      message: `Order is updated successfully!`,
      info: updateOrder,
    };
  }

  @Delete(':report_id')
  @UseGuards(AuthGuard)
  @Permission('WORK_ORDER', ['DELETE']) // Assuming you have a DELETE permission
  async DeleteWorkOrder(
    @Param('report_id') report_id: string,
    @Req() req: Request,
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const findWorkOrder = await this.ordersService.findByReportId(
      tenantId,
      +report_id,
    );
    if (!findWorkOrder) {
      throw new BadRequestException(
        `Order with report_id ${report_id} not found!`,
      );
    }

    await this.ordersService.deleteOrder(+report_id, tenantId);

    return {
      message: `Order with report_id ${report_id} has been deleted successfully!`,
      deletedReportId: +report_id,
    };
  }
}
