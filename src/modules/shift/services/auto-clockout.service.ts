import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutoClockoutService {
  private readonly logger = new Logger(AutoClockoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Chicago', // CST timezone
  })
  async handleAutomaticClockouts() {
    this.logger.log('Starting automatic clock-out process...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Set to 23:59:59 of previous day
      const endOfYesterday = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59
      );
      const endOfYesterdayTimestamp = Math.trunc(endOfYesterday.getTime());

      // Start of yesterday for query
      const startOfYesterday = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        0,
        0,
        0
      );
      const startOfYesterdayTimestamp = Math.trunc(startOfYesterday.getTime());

      // Find all incomplete shifts from yesterday
      const incompleteShifts = await this.prisma.shiftTimeRecord.findMany({
        where: {
          clockin_time: {
            gte: startOfYesterdayTimestamp,
            lt: endOfYesterdayTimestamp,
          },
          clockout_time: null, // Only get shifts that haven't been clocked out
        },
      });

      this.logger.log(`Found ${incompleteShifts.length} incomplete shifts from yesterday`);

      // Process each incomplete shift
      for (const shift of incompleteShifts) {
        try {
          await this.prisma.shiftTimeRecord.update({
            where: {
              id: shift.id,
            },
            data: {
              // If job wasn't finished, set it to end of day
              finishjob_time: shift.finishjob_time || endOfYesterdayTimestamp,
              // Set clock out time to end of day
              clockout_time: endOfYesterdayTimestamp,
            },
          });

          this.logger.log(
            `Successfully auto-clocked out shift ${shift.id} for worker ${shift.worker_id}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to auto-clock out shift ${shift.id} for worker ${shift.worker_id}`,
            error
          );
        }
      }

      this.logger.log('Completed automatic clock-out process');
    } catch (error) {
      this.logger.error('Error in automatic clock-out process:', error);
    }
  }

  // Optional: Add a method to manually trigger the process if needed
  async manuallyProcessIncompleteShifts(date: Date) {
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59
    );
    const endOfDayTimestamp = Math.trunc(endOfDay.getTime());

    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0
    );
    const startOfDayTimestamp = Math.trunc(startOfDay.getTime());

    const incompleteShifts = await this.prisma.shiftTimeRecord.findMany({
      where: {
        clockin_time: {
          gte: startOfDayTimestamp,
          lt: endOfDayTimestamp,
        },
        clockout_time: null,
      },
    });

    for (const shift of incompleteShifts) {
      await this.prisma.shiftTimeRecord.update({
        where: {
          id: shift.id,
        },
        data: {
          finishjob_time: shift.finishjob_time || endOfDayTimestamp,
          clockout_time: endOfDayTimestamp,
        },
      });
    }

    return incompleteShifts.length;
  }
}