import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWorkerDto {

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  groupId: string;

  @IsNotEmpty()
  @IsNumber()
  daily_pay_rate: number;

  @IsNotEmpty()
  @IsNumber()
  extra_hourly_rate: number;
}

export class UpdateWorkerDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  groupId: string;
  
  @IsNotEmpty()
  @IsNumber()
  daily_pay_rate: number;

  @IsNotEmpty()
  @IsNumber()
  extra_hourly_rate: number;
}

export class LoginWorkerDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
