import { Module, forwardRef } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [WorkerController],
  providers: [WorkerService, JwtService],
  imports: [PrismaModule, forwardRef(() => AdminModule), GlobalAdminModule ],
  exports: [WorkerService],
})
export class WorkerModule {}
