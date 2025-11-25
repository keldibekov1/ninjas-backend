import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  name: string;
}
