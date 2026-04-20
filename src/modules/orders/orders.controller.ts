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
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Response } from 'express';
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
import { OrdersExcelService } from './excel.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("orders")
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly apiPpwService: ApiPpwService,
    private readonly taskService: TaskService,
    private readonly workerService: WorkerService,
    private readonly assignmentService: AssignmentService,
    private readonly jobNotesService: JobNotesService,
    private readonly ordersExcelService: OrdersExcelService
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

 @Get('export/excel')
  @UseGuards(AuthGuard)
  async exportExcel(
    @Query() query: FilerOrdersQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
     console.log('req.user:', JSON.stringify((req as any).user));
    const tenantId = (req as any).user?.tenantId;
    console.log('tenantId:', tenantId);
    const buffer = await this.ordersExcelService.generateExcel(query, Number(tenantId));
 
    const filename = `work-orders-${new Date().toISOString().split('T')[0]}.xlsx`;
 
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
 
    res.end(buffer);
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
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const startTime = new Date();

    const PrimaryOrdersAPI = await this.apiPpwService.getAll(tenantId);
    const all_orders_primary: PrimaryOrdersListType = PrimaryOrdersAPI.data;

    const tasksFromDB = await this.taskService.getAll();

    for (const workOrder of all_orders_primary.result_data) {
      const singleOrderApi = await this.apiPpwService.getOne(
        tenantId,
        workOrder.report_id,
      );
      const primaryOrder: SingleOrderType = singleOrderApi.data;

      // Fetch coordinates if address, city, and state are available
      let coordinates = null;
      if (
        primaryOrder.result_data.address &&
        primaryOrder.result_data.city &&
        primaryOrder.result_data.state
      ) {
        coordinates = await getCoordinates(
          primaryOrder.result_data.address,
          primaryOrder.result_data.city,
          primaryOrder.result_data.state,
        );

        await delay(1000); // 1 second delay between requests
      }

      // delete unnecessary fields
      delete primaryOrder.remote_site_id;
      delete primaryOrder.success;
      delete primaryOrder.return_error_msg;

      // assign single order data to details field
      workOrder.details = primaryOrder.result_data;

      const findByReportId = await this.ordersService.findByReportId(
        tenantId,
        workOrder.report_id,
      );

      if (findByReportId) {
        // update work order details - Fixed parameter order here
        await this.ordersService.update(workOrder.report_id, tenantId, {
          address: workOrder.details.address,
          city: workOrder.details.city,
          zip: workOrder.details.zip,
          coordinates: coordinates || findByReportId.coordinates,
          broker_company: workOrder.details.broker_company,
          broker_email: workOrder.details.broker_email,
          autoimport_client_orig:
            workOrder.details.key_values.autoimport_client_orig,
          autoimport_userid: workOrder.details.key_values.autoimport_userid,
          bg_checkin_provider: workOrder.details.key_values.bg_checkin_provider,
          broker_name: workOrder.details.broker_name,
          broker_phone: workOrder.details.broker_phone,
          comments: workOrder.details.comments,
          client_company_alias: workOrder.details.client_company_alias,
          cust_text: String(workOrder.details.cust_text),
          date_due: workOrder.details.date_due,
          has_foh: workOrder.details.has_foh,
          date_received: workOrder.details.date_received,
          import_user_id: workOrder.details.import_user_id,
          key_code: workOrder.details.key_code,
          loan_number: workOrder.details.loan_number,
          loan_type_other: workOrder.details.loan_type_other,
          lock_code: workOrder.details.lock_code,
          lot_size: workOrder.details.lot_size,
          mcs_woid: workOrder.details.key_values.mcs_woid,
          mortgage_name: workOrder.details.mortgage_name,
          org_wo_num: workOrder.org_wo_num,
          start_date: workOrder.details.start_date,
          state: workOrder.details.state,
          ppw_report_id: workOrder.details.ppw_report_id,
          wo_number: workOrder.wo_number,
          wo_number_orig: workOrder.details.key_values.wo_number_orig,
          wo_status: workOrder.details.wo_status,
          wo_photo_ts_format: workOrder.details.key_values.wo_photo_ts_format,
          work_type_alias: workOrder.details.work_type_alias,
          tenantId,
        });

        // update task details
        for (const line_item_task of workOrder.details.line_items) {
          const isExistedTask = tasksFromDB.find((item) => {
            return (
              item.report_id === workOrder.report_id &&
              item.desc === line_item_task.desc
            );
          });

          if (!isExistedTask) {
            const possibleDataTask = tasksFromDB.find((item) => {
              item.desc = item.desc.replace(/\s/g, '').toLowerCase();

              return (
                item.report_id === workOrder.report_id &&
                isSimilar(
                  item.desc,
                  findMostSuitableDescription(
                    line_item_task.desc,
                    tasksFromDB
                      .filter((task) => task.report_id === workOrder.report_id)
                      .map((task) => task.desc),
                  )
                    .replace(/\s/g, '')
                    .toLowerCase(),
                )
              );
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
            // just update info if existed (easy, all complex logic is above, if not exist!)
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
      } else {
        // create work orders
        await this.ordersService.create({
          report_id: workOrder.report_id,
          address: workOrder.details?.address,
          city: workOrder.details?.city,
          zip: workOrder.details?.zip,
          coordinates: coordinates,
          broker_company: workOrder.details?.broker_company,
          broker_email: workOrder.details?.broker_email,
          autoimport_client_orig:
            workOrder.details?.key_values.autoimport_client_orig,
          autoimport_userid: workOrder.details?.key_values.autoimport_userid,
          bg_checkin_provider: workOrder.details.key_values.bg_checkin_provider,
          broker_name: workOrder.details.broker_name,
          broker_phone: workOrder.details.broker_phone,
          comments: workOrder.details.comments,
          client_company_alias: workOrder.details.client_company_alias,
          cust_text: String(workOrder.details.cust_text),
          date_due: workOrder.details.date_due,
          has_foh: workOrder.details.has_foh,
          date_received: workOrder.details.date_received,
          import_user_id: workOrder.details.import_user_id,
          key_code: workOrder.details.key_code,
          loan_number: workOrder.details.loan_number,
          loan_type_other: workOrder.details.loan_type_other,
          lock_code: workOrder.details.lock_code,
          lot_size: workOrder.details.lot_size,
          mcs_woid: workOrder.details.key_values.mcs_woid,
          mortgage_name: workOrder.details.mortgage_name,
          org_wo_num: workOrder.org_wo_num,
          start_date: workOrder.details.start_date,
          state: workOrder.details.state,
          ppw_report_id: workOrder.details.ppw_report_id,
          wo_number: workOrder.wo_number,
          wo_number_orig: workOrder.details.key_values.wo_number_orig,
          wo_status: workOrder.details.wo_status,
          wo_photo_ts_format: workOrder.details.key_values.wo_photo_ts_format,
          work_type_alias: workOrder.details.work_type_alias,
          tenantId,
        });

        // create task related to report_id
        await this.taskService.create(
          tenantId,
          workOrder.report_id,
          workOrder.details.line_items,
        );

        // create job notes
        const jobNotesPrimary = await this.apiPpwService.getJobNotes(
          tenantId,
          workOrder.report_id,
        );
        const notesData: PrimaryJobNotesType[] =
          jobNotesPrimary?.data?.result_data;

        if (notesData.length !== 0) {
          for (const note of notesData) {
            await this.jobNotesService.create({
              report_id: workOrder.report_id,
              note_text: note.note_text,
              tenantId,
            });
          }
        }
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
          await this.ordersService.updateCoordinates(
            order.report_id,
            tenantId,
            coordinates,
          );
        }
      } catch (error) {
        console.error(
          `Error updating coordinates for order ${order.report_id}:`,
          error,
        );
      }

      await delay(1000); // Respect rate limits
    }
    // Calculate the elapsed time
    const endTime = new Date();
    const elapsedTime = endTime.getTime() - startTime.getTime();

    // Format the elapsed time
    const formattedTime = formatTime(elapsedTime);

    // update sync log time
    await this.ordersService.syncLog(tenantId, formattedTime);

    return {
      message: 'Orders is synced successfully!',
      spentTime: formattedTime,
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
