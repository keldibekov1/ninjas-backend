import { IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetCrewReportsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  crewId?: number;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  includeCompletedOnly?: boolean = false;
}