import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwt_config } from '../../configs';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwt_config.access_secret,
      signOptions: { expiresIn: jwt_config.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}