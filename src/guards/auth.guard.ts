import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../modules/admin/admin.service';
import { WorkerService } from '../modules/worker/worker.service';
import { GlobalAdminService } from '../modules/global-admin/global-admin.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { tokenFormatter } from '../utils';
import { JwtPayloadType } from '../types';
import { jwt_config } from '../configs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly adminService: AdminService,
    private readonly workerService: WorkerService,
    private readonly globalAdminService: GlobalAdminService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const token = tokenFormatter(req.header('authorization'));

    if (!token) {
      throw new UnauthorizedException('Token is not provided!');
    }

    let payload: JwtPayloadType;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: jwt_config.access_secret,
      });

      if (!payload || !payload.info?.id) {
        throw new BadRequestException('Invalid token payload: missing user ID');
      }
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired. Please refresh your token.');
      }
      throw new UnauthorizedException(`Token verification failed: ${err.message}`);
    }

    const userId = Number(payload.info.id);
    const payloadTenantId = Number(payload.info.tenantId);

    if (isNaN(userId) || userId <= 0) {
      throw new BadRequestException('Invalid user ID in token');
    }

    try {
      // Check tenant users first (admin/worker) if JWT contains tenantId
      if (payloadTenantId && !isNaN(payloadTenantId)) {
        const admin = await this.adminService.findById(payloadTenantId, userId).catch(() => null);
        if (admin) {
          if (admin.tenantId) {
            await this.validateTenantStatus(admin.tenantId);
          }

          req['user'] = { 
            ...admin, 
            type: 'admin', 
            tenantId: admin.tenantId 
          };
          return true;
        }

        const worker = await this.workerService.findById(payloadTenantId, userId).catch(() => null);
        if (worker) {
          if (worker.tenantId) {
            await this.validateTenantStatus(worker.tenantId);
          }

          req['user'] = { 
            ...worker, 
            type: 'worker', 
            tenantId: worker.tenantId 
          };
          return true;
        }
      }
      
      // Check global admin only if JWT doesn't have tenantId
      if (!payloadTenantId || isNaN(payloadTenantId)) {
        const globalAdmin = await this.globalAdminService.findById(userId).catch(() => null);
        if (globalAdmin) {
          req['user'] = { 
            ...globalAdmin, 
            type: 'global_admin',
            tenantId: payloadTenantId || null 
          };
          req['globalAdmin'] = globalAdmin;
          return true;
        }
      }

      throw new UnauthorizedException(`User with ID ${userId} not found`);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(`Authentication failed: ${error.message}`);
    }
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
        // Allow access
        break;
      default:
        throw new UnauthorizedException('Invalid tenant status');
    }
  }
}