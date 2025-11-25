import { IsNotEmpty, IsString } from 'class-validator';

export class GlobalAdminLoginDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
