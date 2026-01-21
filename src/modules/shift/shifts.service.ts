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
    clockin_time,
  }: ClockInDto & { tenantId: number }) {
    // Instead of duplicating the date check logic, use getCurrentShift
    const currentShift = await this.getCurrentShift(workerId, tenantId);

    if (currentShift.hasShift) {
      if (currentShift.shiftStatus === 'completed') {
        throw new BadRequestException(
          'Worker has already completed a shift today',
        );
      }
      throw new BadRequestException('Worker already has an active shift');
    }

    return this.prisma.shiftTimeRecord.create({
      data: {
        worker: {
          connect: { id: workerId },
        },
        tenant: {
          connect: { id: tenantId },
        },
        clockin_time: Math.trunc(clockin_time),
        finishjob_time: 0,
        clockout_time: 0,
      },
    });
  }

  // Rest of the service methods remain the same...
  async finishJob(finishJobDto: FinishJobDto, tenantId: number) {
    const { id, finishjob_time } = finishJobDto;

    const shift = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${id} not found or unauthorized`,
      );
    }

    return this.prisma.shiftTimeRecord.update({
      where: {
        id_tenantId: {
          id,
          tenantId,
        },
      },
      data: {
        finishjob_time: Math.trunc(finishjob_time),
      },
    });
  }

  async clockOut(clockOutDto: ClockOutDto, tenantId: number) {
    const { id, clockout_time } = clockOutDto;

    const shift = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!shift) {
      throw new NotFoundException(
        `Shift with ID ${id} not found or unauthorized`,
      );
    }

    return this.prisma.shiftTimeRecord.update({
      where: {
        id_tenantId: {
          id,
          tenantId,
        },
      },
      data: {
        clockout_time: Math.trunc(clockout_time),
      },
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
    const todayTimestamp = todayStart.getTime();

    const record = await this.prisma.shiftTimeRecord.findFirst({
      where: {
        worker_id: workerId,
        clockin_time: { gte: todayTimestamp },
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
        const fromDate = new Date(from * 1000);
        fromDate.setHours(0, 0, 0, 0);
        whereClause.clockin_time.gte = fromDate.getTime();
      }

      if (to) {
        const toDate = new Date(to * 1000);
        toDate.setHours(23, 59, 59, 999);
        whereClause.clockin_time.lte = toDate.getTime();
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
