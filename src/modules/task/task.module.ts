import { forwardRef, Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpenseModule } from '../expense/expense.module';
import { WorkerModule } from '../worker/worker.module';
import { ApiPpwModule } from '../api-ppw/api-ppw.module';
import { OrdersModule } from '../orders/orders.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [TaskController],
  providers: [
    TaskService,
    AdminService,
    WorkerService,
    JwtService
  ],
  exports: [TaskService],
  imports: [
    PrismaModule,
    ExpenseModule,
    WorkerModule,
    ApiPpwModule,
    forwardRef(() => OrdersModule),
    GlobalAdminModule,
  ],
})
export class TaskModule {}
