import { Controller, Get, Query, Req, UnauthorizedException, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CrewReportsService } from './crew-reports.service';
import { GetCrewReportsDto } from './dto/get-crew-reports.dto';
import { GetReportsDto } from './dto/get-reports.dto';
import { AuthGuard } from 'src/guards';
import { CrewReportResponse, CrewPerformanceMetrics } from './types/crew-reports.types';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly crewReportsService: CrewReportsService
  ) {}

  @Get('all')
  async getAllWorkerReports(
    @Query() filters: GetReportsDto,
    @Req() req: Request
  ) {
    const tenantId = req['user']?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('User must be authenticated with a valid tenant');
    }

    return this.reportsService.getAllWorkerReports(filters, tenantId);
  }

  @Get('crew-reports')
  async getCrewReports(
    @Query() filters: GetCrewReportsDto,
    @Req() req: any
  ): Promise<CrewReportResponse> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('User must be authenticated with a valid tenant');
    }

    return this.crewReportsService.getCrewReport(filters, tenantId);
  }

  @Get('crew-reports/:crewId/performance')
  async getCrewPerformance(
    @Param('crewId', ParseIntPipe) crewId: number,
    @Req() req: any
  ): Promise<CrewPerformanceMetrics> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('User must be authenticated with a valid tenant');
    }

    return this.crewReportsService.getCrewPerformanceMetrics(crewId, tenantId);
  }
}