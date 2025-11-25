import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { jwt_config } from '../../configs';
import * as crypto from 'crypto';
import { JwtPayloadType } from '../../types';
import { GoogleSignupDto } from './dto/google-signup.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  private async validateTenantStatus(tenantId: number): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { 
        status: true, 
        name: true,
        domain: true 
      }
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    switch (tenant.status) {
      case 'SUSPENDED':
        throw new UnauthorizedException(
          `Access suspended. Your organization "${tenant.name}" has been temporarily suspended. Please contact support.`
        );
      case 'CANCELLED':
        throw new UnauthorizedException(
          `Access denied. Your organization "${tenant.name}" subscription has been cancelled. Please contact support.`
        );
      case 'ACTIVE':
        break;
      default:
        throw new UnauthorizedException('Invalid tenant status');
    }
  }

  async login(email: string, password: string) {
    const admin = await this.prisma.admin.findFirst({
      where: { 
        OR: [
          { email: email },
          { username: email }
        ]
      },
      include: {
        tenant: true
      }
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.tenantId) {
      await this.validateTenantStatus(admin.tenantId);
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      info: {
        id: admin.id,
        tenantId: admin.tenantId,
        name: admin.name,
        username: admin.username,
        password: admin.password,
        role: admin.role,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      },
    });

    return {
      admin: { ...admin, password: undefined },
      accessToken,
      refreshToken
    };
  }

  async googleAuth(token: string) {
    try {
      const userInfo = await this.verifyGoogleToken(token);

      if (!userInfo.email) {
        throw new BadRequestException('Email not found in Google account');
      }

      let admin = await this.prisma.admin.findFirst({
        where: { 
          OR: [
            { email: userInfo.email },
            { username: userInfo.email }
          ]
        },
        include: {
          tenant: true,
        },
      });

      if (!admin) {
        throw new UnauthorizedException('Account not found. Please sign up first.');
      }

      if (admin.tenantId) {
        await this.validateTenantStatus(admin.tenantId);
      }

      if (!admin.googleId) {
        admin = await this.prisma.admin.update({
          where: { id: admin.id },
          data: {
            googleId: userInfo.sub,
            emailVerified: new Date()
          },
          include: {
            tenant: true
          }
        });
      }

      const { accessToken, refreshToken } = await this.generateTokens({
        info: {
          id: admin.id,
          tenantId: admin.tenantId,
          name: admin.name,
          username: admin.username,
          password: admin.password,
          role: admin.role,
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        },
      });

      return {
        admin: { ...admin, password: undefined },
        accessToken,
        refreshToken
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Google authentication failed');
    }
  }

  async googleSignup(data: GoogleSignupDto) {
    try {
      const userInfo = await this.verifyGoogleToken(data.token);

      if (!userInfo.email) {
        throw new BadRequestException('Email not found in Google account');
      }

      const existingTenant = await this.prisma.tenant.findFirst({
        where: { domain: data.domain },
      });

      if (existingTenant) {
        throw new BadRequestException('Domain is already taken');
      }

      const existingAdmin = await this.prisma.admin.findFirst({
        where: { 
          OR: [
            { email: userInfo.email },
            { username: userInfo.email }
          ]
        },
      });

      if (existingAdmin) {
        throw new BadRequestException('Email is already registered');
      }

      return this.prisma.$transaction(async (prisma) => {
        const tenant = await prisma.tenant.create({
          data: {
            name: data.companyName,
            domain: data.domain,
            status: 'ACTIVE',
            plan: 'BASIC',
          },
        });

        const password = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const admin = await prisma.admin.create({
          data: {
            name: userInfo.name || userInfo.email.split('@')[0],
            username: userInfo.email,
            email: userInfo.email,
            password: hashedPassword,
            tenantId: tenant.id,
            role: 'ADMIN',
            googleId: userInfo.sub,
            emailVerified: new Date(),
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            tenant: true,
          },
        });

        const { accessToken, refreshToken } = await this.generateTokens({
          info: {
            id: admin.id,
            tenantId: tenant.id,
            name: admin.name,
            username: admin.username,
            password: null,
            role: admin.role,
            createdAt: admin.createdAt.toISOString(),
            updatedAt: admin.updatedAt.toISOString(),
          },
        });

        return {
          success: true,
          tenant,
          admin,
          accessToken,
          refreshToken,
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to create account');
    }
  }

  async signup(data: SignupDto) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { domain: data.domain },
    });

    if (existingTenant) {
      throw new BadRequestException('Domain is already taken');
    }

    const existingAdmin = await this.prisma.admin.findFirst({
      where: { 
        OR: [
          { email: data.email },
          { username: data.email }
        ]
      },
    });

    if (existingAdmin) {
      throw new BadRequestException('Email is already registered');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    let googleId: string | undefined;
    if (data.googleToken) {
      const googleData = await this.verifyGoogleToken(data.googleToken);
      if (googleData.email !== data.email) {
        throw new BadRequestException('Email mismatch with Google account');
      }
      googleId = googleData.sub;
    }

    return this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: data.companyName,
          domain: data.domain,
          status: 'ACTIVE',
          plan: 'BASIC',
        },
      });

      let password = data.password;
      if (!password) {
        password = Math.random().toString(36).slice(-8);
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const admin = await prisma.admin.create({
        data: {
          name: data.name,
          username: data.email,
          email: data.email,
          password: hashedPassword,
          tenantId: tenant.id,
          role: 'ADMIN',
          verificationToken,
          googleId,
          emailVerified: googleId ? new Date() : null,
        },
      });

      if (!googleId) {
        await this.sendVerificationEmail(admin.email, verificationToken);
      }

      const { accessToken, refreshToken } = await this.generateTokens({
        info: {
          id: admin.id,
          tenantId: admin.tenantId,
          name: admin.name,
          username: admin.username,
          password: null,
          role: admin.role,
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        },
      });

      return {
        tenant,
        admin: { ...admin, password: undefined, verificationToken: undefined },
        accessToken,
        refreshToken,
      };
    });
  }

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadType>(
        refreshToken,
        {
          secret: jwt_config.refresh_secret,
        }
      );

      if (!payload || !payload.info?.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (payload.info.tenantId) {
        await this.validateTenantStatus(payload.info.tenantId);
      }

      const newAccessToken = await this.jwtService.signAsync(
        { info: payload.info },
        {
          secret: jwt_config.access_secret,
          expiresIn: jwt_config.expiresIn,
        }
      );

      return newAccessToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async generateTokens(payload: { info: JwtPayloadType['info'] }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.jwtService.signAsync(
      payload,
      {
        secret: jwt_config.access_secret,
        expiresIn: jwt_config.expiresIn,
      }
    );

    const refreshToken = await this.jwtService.signAsync(
      payload,
      {
        secret: jwt_config.refresh_secret,
        expiresIn: jwt_config.refresh_expiresIn,
      }
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async sendVerificationEmail(email: string, token: string) {
    // Implement your email sending logic here
    console.log(`Sending verification email to ${email} with token ${token}`);
  }

  private async verifyGoogleToken(token: string) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify Google token');
      }
      
      const userInfo = await response.json();
      
      if (!userInfo.email) {
        throw new Error('Email not found in Google account');
      }
      
      return userInfo;
    } catch (error) {
      throw new BadRequestException('Invalid Google token');
    }
  }
}