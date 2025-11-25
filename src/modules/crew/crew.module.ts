import { Module } from '@nestjs/common';
import { CrewController } from './crew.controller';
import { CrewService } from './crew.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [CrewController],
  providers: [
    CrewService, 
    PrismaService, 
    AdminService,
    WorkerService,
    GlobalAdminService,
    JwtService
  ],
  exports: [CrewService],
})
export class CrewModule {}
