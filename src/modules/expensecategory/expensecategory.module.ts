import { Module } from '@nestjs/common';
import { ExpenseCategoriesService } from './expensecategory.service';
import { ExpenseCategoriesController } from './expensecategory.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AdminModule } from '../admin/admin.module';
import { WorkerModule } from '../worker/worker.module';
import { AuthGuard } from '../../guards/auth.guard';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    AdminModule,
    WorkerModule,
    GlobalAdminModule,
  ],
  controllers: [ExpenseCategoriesController],
  providers: [
    GlobalAdminService, 
    ExpenseCategoriesService, 
    PrismaService, 
    AuthGuard, 
    JwtService
  ],
})
export class ExpenseCategorysModule {}