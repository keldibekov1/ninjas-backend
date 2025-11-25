import { IsNotEmpty, IsString, IsEnum, MinLength, Matches } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class CreateGlobalAdminDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak. It should contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password: string;

  @IsNotEmpty()
  @IsEnum(RoleEnum)
  role: RoleEnum;
}