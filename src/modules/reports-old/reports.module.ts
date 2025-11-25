import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkerModule } from '../worker/worker.module';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  imports: [PrismaModule, WorkerModule],
})
export class ReportsModule {}
