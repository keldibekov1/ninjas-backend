import { IsEmail, IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
  })
  password?: string;

  @IsString()
  @IsOptional()
  googleToken?: string;

  @IsString()
@Matches(/^[a-z0-9.-]+$/, {
  message: 'Domain can only contain lowercase letters, numbers, hyphens, and dots',
})
  domain: string;

  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters long' })
  companyName: string;
}
