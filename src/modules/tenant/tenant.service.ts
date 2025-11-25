import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { validate as validateUUID } from 'uuid';
import * as crypto from 'crypto';
import { TenantStatus } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  // Utility method to hash PPW password with SHA1
  private hashPasswordSHA1(password: string): string {
    return crypto.createHash('sha1').update(password).digest('hex');
  }


  
  async suspendTenant(id: number, reason?: string) {
  await this.findTenantById(id);

  const tenant = await this.prisma.tenant.update({
    where: { id },
    data: { 
      status: TenantStatus.SUSPENDED,
      updatedAt: new Date()
    },
  });

  // Log the action (you might want to store this in a separate audit table)
  console.log(`Tenant ${id} (${tenant.name}) suspended. Reason: ${reason || 'No reason provided'}`);
  
  return tenant;
}

async activateTenant(id: number) {
  await this.findTenantById(id);

  const tenant = await this.prisma.tenant.update({
    where: { id },
    data: { 
      status: TenantStatus.ACTIVE,
      updatedAt: new Date()
    },
  });

  console.log(`Tenant ${id} (${tenant.name}) activated`);
  
  return tenant;
}

async cancelTenant(id: number, reason?: string) {
  await this.findTenantById(id);

  const tenant = await this.prisma.tenant.update({
    where: { id },
    data: { 
      status: TenantStatus.CANCELLED,
      updatedAt: new Date()
    },
  });

  console.log(`Tenant ${id} (${tenant.name}) cancelled. Reason: ${reason || 'No reason provided'}`);
  
  return tenant;
}

async getTenantsByStatus(status: TenantStatus) {
  return this.prisma.tenant.findMany({
    where: { status },
    select: {
      id: true,
      name: true,
      domain: true,
      plan: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      ppwUsername: true,
      ppwSiteId: true,
      _count: {
        select: {
          admins: true,
          workers: true,
          orders: true,
        },
      },
    },
  });
}

async findActiveTenants() {
  return this.prisma.tenant.findMany({
    where: {
      status: TenantStatus.ACTIVE
    },
    select: {
      id: true,
      name: true,
      domain: true,
      plan: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          admins: true,
          workers: true,
          orders: true,
        },
      },
    },
  });
}

// Helper method to check if tenant is active
async isTenantActive(id: number): Promise<boolean> {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id },
    select: { status: true }
  });
  
  return tenant?.status === TenantStatus.ACTIVE;
}



  async createTenant(data: CreateTenantDto) {
    const { adminData, ppwUsername, ppwPassword, ppwSiteId, ...tenantData } = data;
    
    // Check if username is already taken across ALL tenants
    const existingAdmin = await this.prisma.admin.findFirst({
      where: { username: adminData.username },
      select: {
        id: true,
        tenantId: true,
        name: true
      }
    });
  
    if (existingAdmin) {
      throw new BadRequestException(`Admin username is already taken (exists in tenant ID: ${existingAdmin.tenantId})`);
    }

    // Validate PPW Site ID if provided
    if (ppwSiteId && !validateUUID(ppwSiteId)) {
      throw new BadRequestException('Invalid PPW Site ID. Must be a valid UUIDv4');
    }
  
    return this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          ...tenantData,
          // Add PPW-related fields if provided
          ...(ppwUsername && { ppwUsername }),
          ...(ppwPassword && { 
            ppwPasswordHash: this.hashPasswordSHA1(ppwPassword) 
          }),
          ...(ppwSiteId && { ppwSiteId }),
        },
      });
  
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await prisma.admin.create({
        data: {
          ...adminData,
          password: hashedPassword,
          tenantId: tenant.id,
          role: 'ADMIN',
        },
      });
  
      return tenant;
    });
  }

  async findAllTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        plan: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ppwUsername: true, // Optionally include PPW username
        ppwSiteId: true,   // Optionally include PPW site ID
        _count: {
          select: {
            admins: true,
            workers: true,
            orders: true,
          },
        },
      },
    });
  }


  async findTenantById(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workers: true,
            orders: true,
          },
        },
      },
    });
  
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
  
    return tenant;
  }
  
  async updateTenant(id: number, data: UpdateTenantDto) {
    // Validate existing tenant
    await this.findTenantById(id);

    // Validate PPW Site ID if provided
    if (data.ppwSiteId && !validateUUID(data.ppwSiteId)) {
      throw new BadRequestException('Invalid PPW Site ID. Must be a valid UUIDv4');
    }

    // Prepare update data
    const updateData: any = { ...data };

    // Hash PPW password if provided
    if (updateData.ppwPassword) {
      updateData.ppwPasswordHash = this.hashPasswordSHA1(updateData.ppwPassword);
      delete updateData.ppwPassword; // Remove plain text password
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            workers: true,
            orders: true,
          },
        },
      },
    });
  }
  
  async deleteTenant(id: number) {
    await this.findTenantById(id);
  
    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}