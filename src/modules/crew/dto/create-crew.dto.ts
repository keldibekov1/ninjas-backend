import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class CrewMemberDto {
  @IsInt()
  workerId: number;

  @IsBoolean()
  @IsOptional()
  isLeader?: boolean = false;
}

export class CreateCrewDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewMemberDto)
  @IsOptional()
  members?: CrewMemberDto[];
}
