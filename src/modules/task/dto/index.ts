import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class StartTaskDto {

  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @IsNotEmpty()
  @IsNumber()
  start_time: number;
}

export class EndTaskDto {
  
  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @IsNotEmpty()
  @IsNumber()
  end_time: number;
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsNumber()
  report_id: number;

  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @IsOptional()
  @IsString()
  desc: string;

  @IsOptional()
  @IsNumber()
  qty: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  add: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsNumber()
  tenantId: number;
  
  @IsOptional()
  @IsString()
  desc: string;

  @IsOptional()
  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  add: string;

  @IsOptional()
  @IsNumber()
  total: number;

  @IsOptional()
  @IsBoolean()
  @Transform((item) => JSON.parse(item.value))
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  completedWorker?: number;
}

export class UpdateTaskAsCompletedDto {
  @IsOptional()
  @IsNumber()
  tenantId: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  taskId: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  workerId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  start_time: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  end_time: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  spent_time: number;
}

export class UpdateTaskCompletionStatusDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  taskId: number;

  @IsNotEmpty()
  @IsBoolean()
  @Transform((item) => JSON.parse(item.value))
  isCompleted: boolean;

  @IsOptional()
  @IsString()
  comment: string;
}
