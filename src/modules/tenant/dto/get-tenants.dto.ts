import { IsOptional, IsEnum } from 'class-validator';
import { TenantStatus, PlanType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class GetTenantsDto {
  @IsOptional()
  @IsEnum(TenantStatus)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Object.values(TenantStatus).includes(value as TenantStatus) 
        ? value 
        : undefined;
    }
    return value;
  })
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(PlanType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return Object.values(PlanType).includes(value as PlanType) 
        ? value 
        : undefined;
    }
    return value;
  })
  plan?: PlanType;
}
