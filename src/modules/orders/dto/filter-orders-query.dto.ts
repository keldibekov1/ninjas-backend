import {
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilerOrdersQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform((item) => Number(item.value))
  report_id: number;

  @IsOptional()
  @IsString()
  org_wo_number: string;

  @IsOptional()
  @IsNumberString()
  loan_number: string;

  @IsOptional()
  @IsString()
  status: string;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => v.toString())
      : [value.toString()]
  )
  @IsArray()
  statuses: string[];

  @IsOptional()
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  zip_code: string;

  @IsOptional()
  @IsNumber()
  @Transform((item) => Number(item.value))
  workerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;
  
  @IsOptional()
  keyword: any;

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => Number(v))
      : [Number(value)]
  )
  workerIds: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => v.toString()); // Case when multiple parameters are passed
    } else if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()); // Case when comma-separated string is passed
    }
    return [];
  })
  @IsArray()
  wo_numbers: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => v.toString()); // Case when multiple parameters are passed
    } else if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()); // Case when comma-separated string is passed
    }
    return [];
  })
  @IsArray()
  work_type_alias?: string | string[];
}