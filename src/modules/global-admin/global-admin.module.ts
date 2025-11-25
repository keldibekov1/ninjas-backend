import { Module, forwardRef } from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service';
import { GlobalAdminAuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwt_config } from '../../configs';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { WorkerModule } from '../worker/worker.module';  // Add this import

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwt_config.access_secret,
      signOptions: { expiresIn: jwt_config.expiresIn },
    }),
    forwardRef(() => AdminModule),
    forwardRef(() => WorkerModule)
  ],
  controllers: [GlobalAdminAuthController],
  providers: [GlobalAdminService],
  exports: [GlobalAdminService],
})
export class GlobalAdminModule {}