import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class GlobalAdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsInt()
  tenantId: number;

  @IsString()
  @IsNotEmpty()
  password: string;
}

