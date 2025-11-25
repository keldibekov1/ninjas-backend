import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { BouncieService } from './bouncie.service';
import { AuthGuard } from 'src/guards';
import { BouncieConfig } from '@prisma/client';

@Controller('bouncie')
@UseGuards(AuthGuard)
export class BouncieController {
  constructor(private readonly bouncieService: BouncieService) {}

  @Post('connect')
  async connect(@Body('code') authorizationCode: string, @Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const result = await this.bouncieService.connect(tenantId, authorizationCode);
    return { message: 'Connected to Bouncie successfully', data: result };
  }

  @Get('config')
  async getBouncieConfiguration(@Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const config = await this.bouncieService.getBouncieConfiguration(tenantId);
    return { message: 'Bouncie configuration retrieved', config };
  }

  @Post('add')
  async connectBouncie(@Body() data: BouncieConfig, @Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const result = await this.bouncieService.updateBouncieConfig(tenantId, data);
    return { message: 'Bouncie configuration updated', info: result };
  }

  @Post('test')
  async testBouncieConnection(@Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const result = await this.bouncieService.testBouncieConnection(tenantId);
    return { message: 'Bouncie connection tested', status: result };
  }

  @Get('vehicles')
  async getVehicles(@Query() params: any, @Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const vehicles = await this.bouncieService.getVehicles(tenantId, params);
    return vehicles;
  }

  @Get('trips')
  async getTrips(@Query() params: any, @Req() req: Request) {
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    const trips = await this.bouncieService.getTrips(tenantId, params);
    return trips;
  }
}