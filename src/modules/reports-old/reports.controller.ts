import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetReportsQueryDo } from './dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('salary-report')
  async getSalaryReport(
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.reportsService.getSalaryReportByWorker(from_date, to_date);
  }

  @Get()
  async getReports(@Query() query: GetReportsQueryDo) {
    const reports = await this.reportsService.getOrdersReport(
      query.workerId,
      query.from_date ? String(query.from_date) : undefined,
      query.to_date ? String(query.to_date) : undefined,
    );
    return {
      message: 'Reports are retrieved successfully!',
      ...reports,
    };
  }

  @Get('shifts')
  async getShifts(
    @Query('workerId') workerId: number,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.reportsService.fetchShifts(workerId, from_date, to_date);
  }
}
