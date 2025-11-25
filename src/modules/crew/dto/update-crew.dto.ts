import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCrewDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}