import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ApiPpwModule } from '../api-ppw/api-ppw.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskModule } from '../task/task.module';
import { AdminModule } from '../admin/admin.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { WorkerModule } from '../worker/worker.module';
import { JobNotesModule } from '../job-notes/job-notes.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { JwtService } from '@nestjs/jwt';
import { OrdersSyncService } from './orders-sync.service';
import { ExpenseService } from '../expense/expense.service';
import { S3Service } from '../s3/s3.service';
import { ExpenseModule } from '../expense/expense.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, JwtService, OrdersSyncService, S3Service],
  imports: [
    ApiPpwModule,
    PrismaModule,
    TaskModule,
    AdminModule,
    AssignmentModule,
    WorkerModule,
    JobNotesModule,
    GlobalAdminModule,
    ExpenseModule,
    ConfigModule 
  ],
  exports: [OrdersService, OrdersSyncService, S3Service],
})
export class OrdersModule {}
