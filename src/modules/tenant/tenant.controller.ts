import { 
  Controller, 
  Post, 
  Get,
  Put,
  Patch,
  Delete,
  Body, 
  Param,
  Query,
  UnauthorizedException,
  HttpCode, 
  HttpStatus,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { Request } from 'express';
import { TenantStatus } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    tenantId?: number;
    type: 'global_admin' | 'tenant_user'; // tenant_user includes admins, workers within a business
    role?: string;
  };
}

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private requireGlobalAdmin(req: AuthenticatedRequest) {
    if (req.user?.type !== 'global_admin') {
      throw new UnauthorizedException('SaaS admin access required');
    }
  }

  // ========== TENANT CRUD - GLOBAL ADMIN ONLY ==========
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllTenants(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: TenantStatus
 
  ) {
    this.requireGlobalAdmin(req);
    
    if (status) {
      return this.tenantService.getTenantsByStatus(status);
    }
    return this.tenantService.findAllTenants();
  }

  @Get('active')
  @UseGuards(AuthGuard) 
  @HttpCode(HttpStatus.OK)
  async getActiveTenants(@Req() req: AuthenticatedRequest) {
    this.requireGlobalAdmin(req);
    return this.tenantService.findActiveTenants();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTenant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.findTenantById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    await this.tenantService.deleteTenant(id);
  }

  // ========== TENANT STATUS MANAGEMENT - GLOBAL ADMIN ONLY ==========
  @Patch(':id/suspend')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async suspendTenant(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string

  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.suspendTenant(id, reason);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async activateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.activateTenant(id);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelTenant(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string
  ) {
    this.requireGlobalAdmin(req);
    return this.tenantService.cancelTenant(id, reason);
  }

  @Get(':id/status')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkTenantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    
    const isActive = await this.tenantService.isTenantActive(id);
    const tenant = await this.tenantService.findTenantById(id);
    
    return {
      tenantId: id,
      tenantName: tenant.name,
      domain: tenant.domain,
      status: tenant.status,
      isActive,
      plan: tenant.plan,
      lastUpdated: tenant.updatedAt,
    };
  }

  // ========== BULK OPERATIONS - GLOBAL ADMIN ONLY ==========
  @Patch('bulk/suspend')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkSuspendTenants(
    @Body() data: { tenantIds: number[]; reason?: string },
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    
    const results = await Promise.allSettled(
      data.tenantIds.map(id => this.tenantService.suspendTenant(id, data.reason))
    );
    
    return {
      suspended: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason.message)
    };
  }

  @Patch('bulk/activate')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkActivateTenants(
    @Body() data: { tenantIds: number[] },
    @Req() req: AuthenticatedRequest
  ) {
    this.requireGlobalAdmin(req);
    
    const results = await Promise.allSettled(
      data.tenantIds.map(id => this.tenantService.activateTenant(id))
    );
    
    return {
      activated: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason.message)
    };
  }
}