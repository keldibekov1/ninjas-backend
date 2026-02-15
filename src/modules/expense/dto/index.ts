import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ExpenseAction } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

// New DTO for file metadata
export class FileMetadataDto {
  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;
}

export class CreateExpenseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileMetadataDto)
  @IsOptional()
  files?: FileMetadataDto[];

  @Transform(({ value }) => parseInt(value, 10)) // Transform string to number
  @IsNumber({}, { message: 'workerId must be a number' }) // Validate as a number
  @IsNotEmpty()
  workerId: number;

  @Transform(({ value }) => parseInt(value, 10)) // Transform string to number
  @IsNumber({}, { message: 'categoryId must be a number' }) // Validate as a number
  @IsNotEmpty()
  categoryId: number;

  @Transform(({ value }) => parseInt(value, 10)) // Transform string to number
  @IsNumber({}, { message: 'orderId must be a number' }) // Validate as a number
  @IsOptional()
  orderId?: number;

  @Transform(({ value }) => parseInt(value, 10)) // Transform string to number
  @IsNumber({}, { message: 'tenantId must be a number' }) // Validate as a number
  @IsOptional()
  tenantId: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'amount must be a number' }) // Validate as a number
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  @IsEnum(ExpenseAction)
  action?: ExpenseAction;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNotEmpty()
  @IsISO8601()
  date?: Date;
}

export class FilterExpensesQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform((item) => +item.value)
  page: number;

  @IsOptional()
  @IsNumber()
  @Transform((item) => +item.value)
  limit: number;

  @IsOptional()
  @IsISO8601()
  from_date: Date;

  @IsOptional()
  @IsISO8601()
  to_date: Date;

  @IsOptional()
  @IsNumber()
  @Transform((item) => +item.value)
  workerId: number;

  @IsOptional()
  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  orderId?: number;
}

export class UpdateExpenseDto {
  @IsInt()
  @IsOptional()
  id: number;

  @IsOptional()
  @IsNumber()
  workerId?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsOptional()
  @IsInt()
  tenantId?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(ExpenseAction)
  action?: ExpenseAction;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNotEmpty()
  @IsISO8601()
  date?: Date;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  deleteFileIds?: number[];
}

export class DeleteExpenseDto {
  @IsInt()
  @IsNotEmpty()
  id: number;
}
