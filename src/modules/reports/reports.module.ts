import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { JwtService } from '@nestjs/jwt';
import { CrewReportsService } from './crew-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    AdminService,
    GlobalAdminService,
    WorkerService,
    JwtService,
    CrewReportsService
  ],
})
export class ReportsModule {}
