import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    const result = await this.authService.signup(signupDto);
    return {
      message: 'Account created successfully',
      ...result,
    };
  }

  @Post('google/signup')
@HttpCode(HttpStatus.CREATED)
async googleSignup(@Body() googleSignupDto: GoogleSignupDto) {
  const result = await this.authService.googleSignup(googleSignupDto);
  return {
    message: 'Account created successfully',
    ...result,
  };
}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() { token }: GoogleAuthDto) {
    const result = await this.authService.googleAuth(token);
    return {
      message: 'Google authentication successful',
      ...result,
    };
  }


  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const accessToken = await this.authService.refreshToken(refreshTokenDto.refreshToken);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}