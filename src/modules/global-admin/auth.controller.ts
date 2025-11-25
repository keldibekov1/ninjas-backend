import { 
  Controller, 
  Post, 
  Get,
  Put,
  Delete,
  Body, 
  Param,
  UnauthorizedException,
  HttpCode, 
  HttpStatus,
  UseGuards,
  Req
} from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service';
import { GlobalAdminLoginDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { jwt_config } from '../../configs';
import { JwtPayloadType } from '../../types';
import { RoleEnum } from '@prisma/client';
import { AuthGuard } from '../../guards/auth.guard';
import { Request } from 'express';

@Controller('global-admin')
export class GlobalAdminAuthController {
  constructor(
    private readonly globalAdminService: GlobalAdminService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: GlobalAdminLoginDto) {
    const admin = await this.globalAdminService.findByUsername(loginDto.username);
    
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: Omit<JwtPayloadType, 'iat' | 'exp'> = {
      info: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        password: null,
        role: admin.role as RoleEnum,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      },
    };

    const token = this.jwtService.sign(payload, {
      secret: jwt_config.access_secret,
      expiresIn: jwt_config.expiresIn,
    });

    return {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllAdmins(@Req() req: Request) {
    if (req['user']?.type !== 'global_admin') {
      throw new UnauthorizedException('Insufficient permissions');
    }
    return this.globalAdminService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAdmin(
    @Param('id') id: string,
    @Req() req: Request
  ) {
    if (req['user']?.type !== 'global_admin') {
      throw new UnauthorizedException('Insufficient permissions');
    }
    return this.globalAdminService.findById(Number(id));
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Req() req: Request
  ) {
    if (req['user']?.type !== 'global_admin') {
      throw new UnauthorizedException('Insufficient permissions');
    }
    return this.globalAdminService.update(Number(id), updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdmin(
    @Param('id') id: string,
    @Req() req: Request
  ) {
    if (req['user']?.type !== 'global_admin') {
      throw new UnauthorizedException('Insufficient permissions');
    }
    await this.globalAdminService.delete(Number(id));
  }
}