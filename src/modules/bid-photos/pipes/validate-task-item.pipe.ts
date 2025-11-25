import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ValidateTaskItemPipe implements PipeTransform {
  transform(value: string) {
    // Just return the task title directly without validation
    return value;
  }
}