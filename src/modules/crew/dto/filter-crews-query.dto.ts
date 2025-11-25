import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterCrewsQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}