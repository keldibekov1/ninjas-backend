import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class StartTaskDto {
  @ApiProperty({ example: 12, description: 'Task ID' })
  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @ApiProperty({ example: 5, description: 'Worker ID' })
  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @ApiProperty({ example: 1716200000, description: 'Task start time (timestamp)' })
  @IsNotEmpty()
  @IsNumber()
  start_time: number;
}

export class EndTaskDto {
  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @ApiProperty({ example: 1716203600, description: 'Task end time (timestamp)' })
  @IsNotEmpty()
  @IsNumber()
  end_time: number;
}

export class CreateTaskDto {
  @ApiProperty({ example: 1001 })
  @IsNotEmpty()
  @IsNumber()
  report_id: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @ApiPropertyOptional({ example: 'Repair wall damage' })
  @IsOptional()
  @IsString()
  desc: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  qty: number;

  @ApiProperty({ example: 150 })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'Extra notes' })
  @IsOptional()
  @IsString()
  add: string;
}


export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  tenantId: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  desc: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  qty: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 'Additional info' })
  @IsOptional()
  @IsString()
  add: string;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  total: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform((item) => JSON.parse(item.value))
  isVisible?: boolean;

  @ApiPropertyOptional({ example: 7, description: 'Completed worker ID' })
  @IsOptional()
  @IsNumber()
  completedWorker?: number;
}


export class UpdateTaskAsCompletedDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  tenantId: number;

  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  taskId: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  workerId: number;

  @ApiProperty({ example: 1716200000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  start_time: number;

  @ApiProperty({ example: 1716203600 })
  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  end_time: number;

  @ApiProperty({ example: 3600, description: 'Spent time in seconds' })
  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  @Transform((item) => +item.value)
  spent_time: number;
}


export class UpdateTaskCompletionStatusDto {
  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  @Transform((item) => +item.value)
  taskId: number;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsBoolean()
  @Transform((item) => JSON.parse(item.value))
  isCompleted: boolean;

  @ApiPropertyOptional({ example: 'Task completed successfully' })
  @IsOptional()
  @IsString()
  comment: string;
}


export class PauseTaskDto {
  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @ApiProperty({ example: 1716201800 })
  @IsNotEmpty()
  @IsNumber()
  pause_time: number;

  @ApiPropertyOptional({ example: 'Lunch break' })
  @IsOptional()
  @IsString()
  reason?: string;
}


export class ResumeTaskDto {
  @ApiProperty({ example: 12 })
  @IsNotEmpty()
  @IsNumber()
  taskId: number;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @ApiProperty({ example: 1716202500 })
  @IsNotEmpty()
  @IsNumber()
  start_time: number;
}

