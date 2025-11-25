import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiPpwService {
  constructor(
    private prisma: PrismaService,
  ) {}

  public async getAll(tenantId: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_all_orders', tenant);
    } catch (err: any) {
      if (err.message === 'getaddrinfo ENOTFOUND www.propertypreswizard.com') {
        throw new InternalServerErrorException('No internet connection!');
      }
      throw new InternalServerErrorException(err.message);
    }
  }

  public async getOne(tenantId: number, report_id: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_order', tenant, report_id);
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  public async getJobNotes(tenantId: number, report_id: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_job_notes', tenant, report_id);
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  private async getTenantCredentials(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ppwUsername: true, ppwPasswordHash: true, ppwSiteId: true }
    });

    if (!tenant || !tenant.ppwUsername || !tenant.ppwPasswordHash || !tenant.ppwSiteId) {
      throw new InternalServerErrorException('PPW credentials not configured');
    }

    return tenant;
  }

  private async apiCall(
  action: 'get_all_orders' | 'get_order' | 'get_job_notes',
  tenant: { ppwUsername: string, ppwPasswordHash: string, ppwSiteId: string },
  report_id?: number,
) {
  const event_data =
    action === 'get_order' || action === 'get_job_notes'
      ? JSON.stringify({ report_id })
      : '{}';

  const response = await axios.post(
    'https://www.propertypreswizard.com/api/link/receiver.php',
    `payload=${JSON.stringify({
      username: tenant.ppwUsername,
      password: tenant.ppwPasswordHash,
      site_id: tenant.ppwSiteId,
      event_name: action,
      event_data: event_data,
    })}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  // Check if the response indicates an authentication or connection error
  if (response.data?.status === 'error') {
    throw new InternalServerErrorException(response.data.message || 'PPW connection failed');
  }

  return response;
}
}