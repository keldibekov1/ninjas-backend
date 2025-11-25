import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from 'src/modules/admin/admin.service';
import { TenantService } from 'src/modules/tenant/tenant.service';
import { WorkerService } from 'src/modules/worker/worker.service';
import { GlobalAdminService } from 'src/modules/global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    StripeService, 
    AdminService, 
    TenantService, 
    WorkerService, 
    GlobalAdminService,
    JwtService
],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}