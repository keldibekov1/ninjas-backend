import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BouncieConfig } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class BouncieService {
    private readonly BOUNCIE_AUTH_URL = 'https://auth.bouncie.com/oauth/token';
    private readonly BOUNCIE_API_URL = 'https://api.bouncie.dev/v1';

  constructor(private prisma: PrismaService) {}

  async getBouncieConfiguration(tenantId: number) {
    return this.prisma.bouncieConfig.findUnique({
      where: { tenantId },
      select: {
        clientId: true,
        clientSecret: true,
        redirectUri: true,
        grantType: true,
        accessToken: true,
        code: true        
      }
    });
  }

  async updateBouncieConfig(tenantId: number, data: BouncieConfig) {
    const config = await this.prisma.bouncieConfig.upsert({
      where: { tenantId },
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        grantType: data.grantType,
        code: data.code,
        redirectUri: data.redirectUri,
        accessToken: data.accessToken
      },
      create: {
        tenantId,
        ...data
      }
    });

    return config;
  }

  async connect(tenantId: number, authorizationCode: string) {
    const config = await this.getBouncieConfiguration(tenantId);
    if (!config) {
      throw new BadRequestException('Bouncie configuration not found');
    }
  
    try {
      const response = await axios.post(this.BOUNCIE_AUTH_URL, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: config.redirectUri
      });
  
      const { access_token, expires_in, token_type } = response.data;
      const fullToken = `${access_token}`;
  
      await this.prisma.bouncieConfig.update({
        where: { tenantId },
        data: {
          accessToken: fullToken,
          code: authorizationCode
        }
      });
  
      return {
        accessToken: access_token,
        expiresIn: expires_in,
        tokenType: token_type
      };
    } catch (error) {
      throw new BadRequestException('Failed to connect to Bouncie: ' + error.message);
    }
  }


  async testBouncieConnection(tenantId: number) {
    const config = await this.getBouncieConfiguration(tenantId);
    if (!config?.accessToken) {
      throw new BadRequestException('No active Bouncie access token found');
    }

    try {
      const response = await axios.get(`${this.BOUNCIE_API_URL}/user`, {
        headers: {
          'Authorization': config.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw new BadRequestException('Failed to connect to Bouncie API');
    }
  }

  async getVehicles(tenantId: number, params: any) {
    const config = await this.getBouncieConfiguration(tenantId);
    if (!config?.accessToken) {
      throw new BadRequestException('No active Bouncie access token found');
    }

    try {
      const response = await axios.get(`${this.BOUNCIE_API_URL}/vehicles`, {
        params,
        headers: {
          'Authorization': config.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch vehicles from Bouncie API');
    }
  }

  async getTrips(tenantId: number, params: any) {
    const config = await this.getBouncieConfiguration(tenantId);
    if (!config?.accessToken) {
      throw new BadRequestException('No active Bouncie access token found');
    }

    try {
      const response = await axios.get(`${this.BOUNCIE_API_URL}/trips`, {
        params,
        headers: {
          'Authorization': config.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch trips from Bouncie API');
    }
  }
}