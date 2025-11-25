import { Module } from '@nestjs/common';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule],
  controllers: [MapsController],
  providers: [
    MapsService,
    AdminService,
    WorkerService,
    GlobalAdminService,
    JwtService
    ],
  exports: [MapsService]
})
export class MapsModule {}