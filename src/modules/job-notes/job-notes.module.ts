import { forwardRef, Module } from '@nestjs/common';
import { JobNotesService } from './job-notes.service';
import { JobNotesController } from './job-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiPpwModule } from '../api-ppw/api-ppw.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminService } from '../admin/admin.service';
import { WorkerService } from '../worker/worker.service';
import { GlobalAdminService } from '../global-admin/global-admin.service';
import { JwtService } from '@nestjs/jwt';
import { S3Service } from '../s3/s3.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [JobNotesController],
  providers: [JobNotesService,
              AdminService,
              WorkerService,
              GlobalAdminService,
              JwtService,
              S3Service,
              ConfigService
  ],
  exports: [JobNotesService],
  imports: [PrismaModule, forwardRef(() => OrdersModule), ApiPpwModule],
})
export class JobNotesModule {}
