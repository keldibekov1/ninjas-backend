import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  wo_number?: string;

  @IsOptional()
  @IsInt()
  tenantId: number;

  @IsOptional()
  @IsNumber()
  org_wo_num?: number;

  @IsOptional()
  @IsString()
  wo_status?: string;

  @IsOptional()
  @IsString()
  client_company_alias?: string;

  @IsOptional()
  @IsString()
  cust_text?: string;

  @IsOptional()
  @IsString()
  loan_number?: string;

  @IsOptional()
  @IsString()
  loan_type_other?: string;

  @IsOptional()
  @IsString()
  date_received?: string;

  @IsOptional()
  @IsString()
  date_due?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  work_type_alias?: string;

  @IsOptional()
  @IsString()
  mortgage_name?: string;

  @IsOptional()
  @IsNumber()
  ppw_report_id?: number;

  @IsOptional()
  @IsString()
  import_user_id?: string;

  @IsOptional()
  @IsString()
  mcs_woid?: string;

  @IsOptional()
  @IsString()
  bg_checkin_provider?: string;

  @IsOptional()
  @IsString()
  autoimport_client_orig?: string;

  @IsOptional()
  @IsString()
  wo_number_orig?: string;

  @IsOptional()
  @IsString()
  wo_photo_ts_format?: string;

  @IsOptional()
  @IsString()
  autoimport_userid?: string;

  @IsOptional()
  @IsString()
  lot_size?: string;

  @IsOptional()
  @IsString()
  lock_code?: string;

  @IsOptional()
  @IsString()
  key_code?: string;

  @IsOptional()
  @IsString()
  broker_name?: string;

  @IsOptional()
  @IsString()
  broker_company?: string;

  @IsOptional()
  @IsString()
  broker_phone?: string;

  @IsOptional()
  @IsString()
  broker_email?: string;

  @IsOptional()
  @IsBoolean()
  has_foh?: boolean;

  @IsOptional()
  @IsString()
  coordinates?: string;

  @IsOptional()
  @IsString()
  bit_photos_url?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
