import { Module } from '@nestjs/common';
import { BidPhotosController } from './bid-photos.controller';
import { BidPhotosService } from './bid-photos.service';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { WorkerModule } from '../worker/worker.module';
import { GlobalAdminModule } from '../global-admin/global-admin.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    S3Module, 
    PrismaModule,
    AdminModule,
    WorkerModule,
    GlobalAdminModule
  ],
  controllers: [BidPhotosController],
  providers: [BidPhotosService, JwtService],
})
export class BidPhotosModule {}


