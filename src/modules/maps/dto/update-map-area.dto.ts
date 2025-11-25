import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class UpdateMapAreaDto {
  @IsOptional()
  @IsObject()
  geometry?: {
    type: string;
    coordinates: number[][][];
  };

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}