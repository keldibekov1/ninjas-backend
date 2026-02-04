import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DeleteShiftsDto,
  FinishJobDto,
  ClockOutDto,
  ClockInDto,
  AddShiftsDto,
  UpdateShiftsDto,
} from './shifts.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentShift(workerId: number, tenantId: number) {
    const workerIdNum = Number(workerId);
    if (isNaN(workerIdNum)) {
      throw new BadRequestException('Invalid worker ID');
    }

    // Get today's date range in the local timezone
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );

    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    // Find any shift for today
    const todayShift = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        worker_id: workerIdNum,
        tenantId,
        clockin_time: {
          gte: Math.floor(todayStart.getTime() / 1000), // Convert to seconds if your DB uses seconds
          lte: Math.floor(todayEnd.getTime() / 1000), // Convert to seconds if your DB uses seconds
        },
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!todayShift) {
      return {
        hasShift: false,
        shiftStatus: 'none',
        shift: null,
      };
    }

    // Determine shift status
    let shiftStatus = 'active';
    if (todayShift.clockout_time > 0) {
      shiftStatus = 'completed';
    } else if (todayShift.finishjob_time > 0) {
      shiftStatus = 'finished_job';
    }

    return {
      hasShift: true,
      shiftStatus,
      shift: todayShift,
    };
  }

  async clockIn({
    tenantId,
    workerId,
    clientRequestId,
    deviceId,
  }: ClockInDto & { tenantId: number }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shiftAction.findUnique({
        where: { tenantId_clientRequestId: { tenantId, clientRequestId } },
        include: { shift: true },
      });
      if (existing) return existing.shift;

      const currentShift = await this.getCurrentShift(workerId, tenantId);
      if (currentShift.hasShift) {
        throw new BadRequestException('Worker already has an active shift');
      }

      const now = Math.floor(Date.now() / 1000);

      const shift = await tx.shiftTimeRecord.create({
        data: {
          worker: { connect: { id: workerId } },
          tenant: { connect: { id: tenantId } },
          clockin_time: now,
          finishjob_time: 0,
          clockout_time: 0,
        },
      });

      await tx.shiftAction.create({
        data: {
          tenantId,
          workerId,
          shiftId: shift.id,
          type: 'CLOCK_IN',
          clientRequestId,
          deviceId,
        },
      });

      return shift;
    });
  }

  async finishJob(finishJobDto: FinishJobDto, tenantId: number) {
    const { id: shiftId, clientRequestId, deviceId } = finishJobDto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shiftAction.findUnique({
        where: { tenantId_clientRequestId: { tenantId, clientRequestId } },
        include: { shift: true },
      });
      if (existing) return existing.shift;

      const shift = await tx.shiftTimeRecord.findFirst({
        where: { id: shiftId, tenantId },
      });

      if (!shift) {
        throw new NotFoundException(
          `Shift with ID ${shiftId} not found or unauthorized`,
        );
      }

      if (shift.clockout_time && shift.clockout_time > 0) {
        throw new BadRequestException('Shift already clocked out');
      }
      if (shift.finishjob_time && shift.finishjob_time > 0) {
        throw new BadRequestException('Job already finished');
      }

      const now = Math.floor(Date.now() / 1000);

      const updated = await tx.shiftTimeRecord.update({
        where: { id_tenantId: { id: shiftId, tenantId } },
        data: { finishjob_time: now },
      });

      await tx.shiftAction.create({
        data: {
          tenantId,
          workerId: shift.worker_id,
          shiftId,
          type: 'FINISH_JOB',
          clientRequestId,
          deviceId,
        },
      });

      return updated;
    });
  }

  async clockOut(clockOutDto: ClockOutDto, tenantId: number) {
    const { id: shiftId, clientRequestId, deviceId } = clockOutDto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shiftAction.findUnique({
        where: { tenantId_clientRequestId: { tenantId, clientRequestId } },
        include: { shift: true },
      });
      if (existing) return existing.shift;

      const shift = await tx.shiftTimeRecord.findFirst({
        where: { id: shiftId, tenantId },
      });

      if (!shift) {
        throw new NotFoundException(
          `Shift with ID ${shiftId} not found or unauthorized`,
        );
      }

      if (shift.clockout_time && shift.clockout_time > 0) {
        throw new BadRequestException('Shift already clocked out');
      }
      if (!shift.clockin_time || shift.clockin_time <= 0) {
        throw new BadRequestException('Shift is not clocked in');
      }

      const now = Math.floor(Date.now() / 1000);

      const updated = await tx.shiftTimeRecord.update({
        where: { id_tenantId: { id: shiftId, tenantId } },
        data: { clockout_time: now },
      });

      await tx.shiftAction.create({
        data: {
          tenantId,
          workerId: shift.worker_id,
          shiftId,
          type: 'CLOCK_OUT',
          clientRequestId,
          deviceId,
        },
      });

      return updated;
    });
  }

  async shiftsUpdate(updateShiftsDto: UpdateShiftsDto) {
    const { id, clockin_time, finishjob_time, clockout_time, date } =
      updateShiftsDto;

    // Convert the Unix timestamp to a Date object
    const dateObj = new Date(date * 1000); // Assuming date is a Unix timestamp in seconds

    // Find the existing shift by id and workerId
    const existingShift = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        id,
      },
    });

    if (!existingShift) {
      throw new NotFoundException(`Shift not found for  ID ${id}`);
    }

    // Update the existing shift with new data
    return this.prisma.shiftTimeRecord.update({
      where: { id: existingShift.id },
      data: {
        finishjob_time,
        clockin_time,
        clockout_time,
        date: dateObj, // Use the Date object
      },
    });
  }

  // Adds a new shift
  async addShift(addShiftsDto: AddShiftsDto) {
    const {
      tenantId,
      workerId,
      clockin_time,
      finishjob_time,
      clockout_time,
      date,
    } = addShiftsDto;

    // Convert the Unix timestamp to a Date object
    const dateObj = new Date(date * 1000); // Assuming date is a Unix timestamp in seconds

    return this.prisma.shiftTimeRecord.create({
      data: {
        tenant: { connect: { id: tenantId } },
        worker: { connect: { id: workerId } },
        clockin_time: Math.trunc(clockin_time),
        finishjob_time: Math.trunc(finishjob_time),
        clockout_time: Math.trunc(clockout_time),
        date: dateObj, // Use the Date object
      },
    });
  }

  // Deletes a shift by worker ID and clockin time
  async deleteShift(deleteShiftsDto: DeleteShiftsDto) {
    const { id } = deleteShiftsDto; // Get id from the DTO

    const deleteResult = await this.prisma.shiftTimeRecord.deleteMany({
      where: {
        id: id, // Match the id
      },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('No shift found to delete'); // Adjust message if needed
    }

    return deleteResult; // Return the result of the deletion
  }

  // Checks if a shift exists for the worker today
  async checkIfRecordExistsForToday(workerId: number): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTimestampSec = Math.floor(todayStart.getTime() / 1000);

    const record = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        worker_id: workerId,
        clockin_time: { gte: todayTimestampSec },
      },
    });

    return !!record;
  }

  async getShiftsMy(workerId: number, tenantId: number) {
    return this.prisma.shiftTimeRecord.findMany({
      where: {
        worker_id: workerId,
        tenantId: tenantId,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        clockin_time: 'desc',
      },
    });
  }

  // Retrieves shifts based on optional worker ID and date filters
  async getShifts(
    workerId?: number,
    from?: number,
    to?: number,
    tenantId?: number,
  ): Promise<any[]> {
    const whereClause: any = {
      tenantId: tenantId, // Filter shifts by tenant
      worker: {
        tenantId: tenantId, // Filter related worker by tenant
      },
    };

    if (workerId) {
      whereClause.worker_id = workerId;
    }

    if (from || to) {
      whereClause.clockin_time = {};

      if (from) {
        const fromDate = new Date(Number(from) * 1000);
        fromDate.setHours(0, 0, 0, 0);

        whereClause.clockin_time.gte = Math.floor(
          fromDate.getTime() / 1000, // ✅ Float timestamp
        );
      }

      if (to) {
        const toDate = new Date(Number(to) * 1000);
        toDate.setHours(23, 59, 59, 999);

        whereClause.clockin_time.lte = Math.floor(
          toDate.getTime() / 1000, // ✅ Float timestamp
        );
      }
    }

    return this.prisma.shiftTimeRecord.findMany({
      where: whereClause,
      include: {
        worker: true,
      },
    });
  }
}
