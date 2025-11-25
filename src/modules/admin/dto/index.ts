import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class CreateAdminDto {
  @IsNotEmpty()
  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  tenantId: number;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateAdminDto {
  @IsOptional()
  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password: string;

  // PPW Configuration Fields
  @IsOptional()
  @IsString()
  ppwUsername?: string;

  @IsOptional()
  @IsString()
  ppwPassword?: string;

  @IsOptional()
  @IsUUID(4)
  ppwSiteId?: string;
}

export class LoginAdminDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsOptional()
  @IsInt()
  tenantId?: number;


  @IsNotEmpty()
  @IsString()
  password: string;
}
