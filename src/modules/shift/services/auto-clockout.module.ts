import { Module } from '@nestjs/common';
import { AutoClockoutController } from './auto-clockout.controller';
import { AutoClockoutService } from './auto-clockout.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoClockoutController],
  providers: [AutoClockoutService],

})
export class AutoClockoutModule {}