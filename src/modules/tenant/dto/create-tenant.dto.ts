import { IsNotEmpty, IsString, IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { TenantStatus, PlanType } from '@prisma/client';

export class CreateTenantDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  domain: string;

    // Optional PPW-related fields
    @IsOptional()
    @IsString()
    ppwUsername?: string;
  
    @IsOptional()
    @IsString()
    ppwPassword?: string;
  
    @IsOptional()
    @IsUUID(4)
    ppwSiteId?: string;

  @IsNotEmpty()
  @IsEnum(TenantStatus)
  status: TenantStatus;

  @IsNotEmpty()
  @IsEnum(PlanType)
  plan: PlanType;

  @IsNotEmpty()
  @IsObject()
  adminData: {
    name: string;
    username: string;
    password: string;
  };
}