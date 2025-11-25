import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwt_config } from '../configs';

const jwtService = new JwtService();

export async function tokenGenerator(payload: any) {
  try {
    // generate access token
    let accessToken = await jwtService.signAsync(payload, {
      expiresIn: jwt_config.expiresIn,
      secret: jwt_config.access_secret,
    });

    // generate refresh token
    let refreshToken = await jwtService.signAsync(payload, {
      expiresIn: '1d',
      secret: jwt_config.refresh_secret,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    if (error instanceof Error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
