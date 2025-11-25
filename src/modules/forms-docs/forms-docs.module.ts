import { Module } from '@nestjs/common';
import { FormsDocsController } from './forms-docs.controller';
import { FormsDocsService } from './forms-docs.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
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
  controllers: [FormsDocsController],
  providers: [FormsDocsService, JwtService],
})
export class FormsDocsModule {}
