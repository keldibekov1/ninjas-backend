import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class ClockInDto {
  @IsNumber()
  workerId: number;

  @IsNumber()
  clockin_time: number;
}

export class FinishJobDto {
  @IsNumber()
  id: number;

  @IsNumber()
  finishjob_time: number;
}

export class ClockOutDto {
  @IsNumber()
  id: number;

  @IsNumber()
  clockout_time: number;
}

export class DeleteShiftsDto {
  @IsInt() 
  @IsNotEmpty()
  id: number; 
}

export class UpdateShiftsDto {
  @IsInt()
  workerId: number;

  @IsInt() // Assuming `id` is also an integer
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  @IsNumber() // For Unix timestamp
  clockin_time: number;

  @IsNotEmpty()
  @IsNumber()
  finishjob_time: number;

  @IsNotEmpty()
  @IsNumber()
  clockout_time: number;

  @IsNotEmpty()
  @IsNumber() // Date sent as Unix timestamp
  date: number;
}

export class AddShiftsDto {
  @IsInt()
  @Min(1, { message: 'Worker ID is required and must be at least 1!' })
  workerId: number;

  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @IsNotEmpty()
  @IsNumber() // For Unix timestamp
  clockin_time: number;
  @IsNotEmpty()
  @IsNumber()
  finishjob_time: number;

  @IsNotEmpty()
  @IsNumber()
  clockout_time: number;

  @IsNotEmpty()
  @IsNumber() // Date sent as Unix timestamp
  date: number;
}
