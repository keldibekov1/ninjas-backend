import { IsInt, IsBoolean } from 'class-validator';

export class AddCrewMemberDto {
  @IsInt()
  workerId: number;

  @IsBoolean()
  isLeader: boolean;
}