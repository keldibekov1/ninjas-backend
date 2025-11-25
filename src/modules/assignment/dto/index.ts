import { IsArray, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AssignOrderDto {
  @IsNotEmpty()
  @IsNumber()
  workerId: number;

  @IsNotEmpty()
  @IsArray()
  report_ids: string[];
}

export class AssignCrewOrderDto {
  @IsNotEmpty()
  @IsNumber()
  crewId: number;

  @IsNotEmpty()
  @IsArray()
  reportIds: string[];
}

export class BulkAssignmentDto {
  assignments: {
    workerId: number;
    reportIds: string[];
  }[];
}