import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from '../../guards/auth.guard';

// Controllers
import { TenantController } from './tenant.controller';

// Services
import { TenantService } from './tenant.service';
import { AdminModule } from '../admin/admin.module';
import { WorkerModule } from '../worker/worker.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AdminModule),
    forwardRef(() => WorkerModule),
    GlobalAdminModule
  ],
  controllers: [
    TenantController,
  ],
  providers: [
    TenantService,
    AuthGuard,
    JwtService
  ],
  exports: [
    TenantService,
  ],
})
export class TenantModule {}