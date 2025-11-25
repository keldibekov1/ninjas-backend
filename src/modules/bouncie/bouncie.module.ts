import { Module } from '@nestjs/common';
import { BouncieController } from './bouncie.controller';
import { BouncieService } from './bouncie.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { JwtService } from '@nestjs/jwt';
import { GlobalAdminService } from '../global-admin/global-admin.service';

@Module({
  controllers: [BouncieController],
  providers: [
    BouncieService, 
    PrismaService,
    AdminService,
    WorkerService,
    JwtService,
    GlobalAdminService
 ],
})
export class BouncieModule {}