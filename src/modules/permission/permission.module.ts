import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService],
  imports: [PrismaModule],
  exports: [PermissionService],
})
export class PermissionModule {}
