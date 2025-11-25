import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkerModule } from '../worker/worker.module';
import { AdminModule } from '../admin/admin.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { JwtService } from '@nestjs/jwt';
import { S3Service } from '../s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, JwtService, S3Service, ConfigService],
  exports: [ExpenseService],
  imports: [PrismaModule, WorkerModule, AdminModule, GlobalAdminModule],
})
export class ExpenseModule {}
