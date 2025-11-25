import { Module } from '@nestjs/common';
import { ApiPpwService } from './api-ppw.service';

@Module({
  providers: [ApiPpwService],
  exports: [ApiPpwService],
})
export class ApiPpwModule {}
