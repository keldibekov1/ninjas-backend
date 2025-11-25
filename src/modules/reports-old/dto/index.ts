import { IsISO8601, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetReportsQueryDo {
  @IsOptional()
  @IsNumber()
  @Transform((item) => +item.value)
  workerId: number;

  @IsOptional()
  @IsISO8601()
  from_date: Date;

  @IsOptional()
  @IsISO8601()
  to_date: Date;
}
