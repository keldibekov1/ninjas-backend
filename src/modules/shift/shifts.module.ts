import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ShiftsController],
  providers: [
    ShiftsService, 
    PrismaService, 
    AdminService,
    WorkerService,
    GlobalAdminService,
    JwtService],
})
export class ShiftsModule {}
