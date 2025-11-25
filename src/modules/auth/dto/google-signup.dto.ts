import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class GoogleSignupDto {
  @IsString()
  @IsNotEmpty({ message: 'Google token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Domain is required' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Domain can only contain lowercase letters, numbers, and hyphens',
  })
  @MinLength(3, { message: 'Domain must be at least 3 characters long' })
  domain: string;

  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MinLength(2, { message: 'Company name must be at least 2 characters long' })
  companyName: string;
}
