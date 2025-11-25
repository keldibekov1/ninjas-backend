import { Module, forwardRef } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionModule } from '../permission/permission.module';
import { WorkerModule } from '../worker/worker.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { ApiPpwService } from '../api-ppw/api-ppw.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ApiPpwService, JwtService, AuthService ],
  exports: [AdminService],
  imports: [PrismaModule, PermissionModule, forwardRef(() => WorkerModule), GlobalAdminModule],
})
export class AdminModule {}
