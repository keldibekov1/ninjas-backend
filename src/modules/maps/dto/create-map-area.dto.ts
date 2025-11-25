import { IsNotEmpty, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMapAreaDto {
  @IsNotEmpty()
  @IsObject()
  geometry: {
    type: string;
    coordinates: number[][][];
  };

  @IsNotEmpty()
  @IsNumber()
  area_size: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

 @IsOptional()
  @IsNumber({}, { message: 'tenantId must be a number conforming to the specified constraints' })
  tenantId?: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })

  @IsNotEmpty()
  @IsNumber()
  createdBy: number;
}