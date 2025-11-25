import { IsNotEmpty, IsString } from "class-validator";

export class LoginAdminDto {
    @IsString()
    @IsNotEmpty()
    username: string;  // This will now accept either username or email
  
    @IsString()
    @IsNotEmpty()
    password: string;
  }