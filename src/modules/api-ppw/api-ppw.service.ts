import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

type PpwAction = 'get_all_orders' | 'get_order' | 'get_job_notes';

@Injectable()
export class ApiPpwService {
  constructor(private prisma: PrismaService) {}

  public async getAll(tenantId: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_all_orders', tenantId, tenant);
    } catch (err: any) {
      if (err?.message?.includes('getaddrinfo ENOTFOUND')) {
        throw new InternalServerErrorException('No internet connection!');
      }
      throw new InternalServerErrorException(
        err?.message || 'PPW getAll failed',
      );
    }
  }

  public async getOne(tenantId: number, report_id: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_order', tenantId, tenant, report_id);
    } catch (err: any) {
      throw new InternalServerErrorException(
        err?.message || 'PPW getOne failed',
      );
    }
  }

  public async getJobNotes(tenantId: number, report_id: number) {
    try {
      const tenant = await this.getTenantCredentials(tenantId);
      return await this.apiCall('get_job_notes', tenantId, tenant, report_id);
    } catch (err: any) {
      throw new InternalServerErrorException(
        err?.message || 'PPW getJobNotes failed',
      );
    }
  }

  private async getTenantCredentials(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ppwUsername: true, ppwPasswordHash: true, ppwSiteId: true },
    });

    if (!tenant?.ppwUsername || !tenant?.ppwSiteId) {
      throw new InternalServerErrorException('PPW credentials not configured');
    }

    return tenant;
  }

  private resolvePassword(tenant: { ppwPasswordHash: string | null }) {
    const envPass = process.env.PPW_TEST_PASSWORD;
    if (envPass && envPass.trim()) return envPass.trim();

    const hardcoded = '4eyxt5E9';
    if (hardcoded) return hardcoded;

    const dbValue = tenant.ppwPasswordHash;
    if (dbValue && dbValue.trim()) return dbValue.trim();

    throw new InternalServerErrorException('PPW password not configured');
  }

  private async apiCall(
    action: 'get_all_orders' | 'get_order' | 'get_job_notes',
    tenantId: number,
    tenant: {
      ppwUsername: string;
      ppwPasswordHash: string | null;
      ppwSiteId: string;
    },
    report_id?: number,
  ) {
    const url = 'https://www.propertypreswizard.com/api/link/receiver.php';

    const event_data =
      action === 'get_order' || action === 'get_job_notes'
        ? JSON.stringify({ report_id })
        : JSON.stringify({});

    const password = process.env.PPW_TEST_PASSWORD?.trim() || '4eyxt5E9';

    const payloadObj = {
      username: tenant.ppwUsername,
      password,
      site_id: tenant.ppwSiteId,
      event_name: action,
      event_data,
    };

    const body = `payload=${encodeURIComponent(JSON.stringify(payloadObj))}`;

    console.log('--- PPW REQUEST ---');
    console.log('tenantId:', tenantId);
    console.log('action:', action);
    console.log('username:', tenant.ppwUsername);
    console.log('site_id:', tenant.ppwSiteId);
    console.log('passwordLen:', password.length);
    if (report_id) console.log('report_id:', report_id);
    console.log('body(first200):', body.slice(0, 200));
    console.log('-------------------');

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (NestJS; PPW Sync)',
        },
        timeout: 30_000,
        validateStatus: () => true,
      });

      console.log('--- PPW RESPONSE ---');
      console.log('status:', response.status);
      const dataStr =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      console.log('data(first800):', (dataStr || '').slice(0, 800));
      console.log('--------------------');

      if (response.status >= 400) {
        throw new InternalServerErrorException(
          `PPW HTTP ${response.status}. Body: ${(dataStr || '').slice(0, 200)}`,
        );
      }

      const data = response.data;

      if (data?.auth_error) {
        throw new InternalServerErrorException(
          data.return_error_msg || 'PPW auth error',
        );
      }
      if (data?.success === false || data?.error === true) {
        throw new InternalServerErrorException(
          data.return_error_msg || 'PPW request failed',
        );
      }
      if (data?.status === 'error') {
        throw new InternalServerErrorException(
          data.message || 'PPW connection failed',
        );
      }

      return response;
    } catch (err: any) {
      console.log('--- PPW ERROR ---');
      console.log('message:', err?.message);
      console.log('code:', err?.code);
      console.log('------------------');
      throw err;
    }
  }
}
