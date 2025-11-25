import { Controller, Post, Body } from '@nestjs/common';
import { AutoClockoutService } from './auto-clockout.service';

@Controller('auto-clockout')
export class AutoClockoutController {
  constructor(private readonly autoClockoutService: AutoClockoutService) {}

  @Post('process')
  async processIncompleteShifts(@Body() body: { date: string }) {
    const date = new Date(body.date);
    const processedCount = await this.autoClockoutService.manuallyProcessIncompleteShifts(date);
    return { processedCount };
  }
}