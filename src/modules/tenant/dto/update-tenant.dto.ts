import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { TenantStatus, PlanType } from '@prisma/client';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  // PPW-related optional fields
  @IsOptional()
  @IsString()
  ppwUsername?: string;

  @IsOptional()
  @IsString()
  ppwPassword?: string;

  @IsOptional()
  @IsUUID(4)
  ppwSiteId?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(PlanType)
  plan?: PlanType;
}