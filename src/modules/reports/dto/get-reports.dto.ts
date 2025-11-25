import { IsOptional, IsInt, IsString, IsDateString, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class GetReportsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  workerId?: number;
  
  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

}