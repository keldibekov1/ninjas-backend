import { forwardRef, Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiPpwModule } from '../api-ppw/api-ppw.module';
import { WorkerModule } from '../worker/worker.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';
import { CrewService } from '../crew/crew.service';

@Module({
  controllers: [AssignmentController],
  providers: [
    AssignmentService,
    AdminService,
    WorkerService,
    GlobalAdminService,
    JwtService,
    CrewService
  ],
  imports: [
    PrismaModule,
    ApiPpwModule,
    WorkerModule,
    forwardRef(() => OrdersModule),
  ],
  exports: [AssignmentService],
})
export class AssignmentModule {}
