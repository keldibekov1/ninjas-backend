import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto, UpdateAdminDto } from './dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { validate as validateUUID } from 'uuid';
import { BouncieConfig } from '@prisma/client';


@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  
  async getAdmins(tenantId: number | null, keyword?: string) {
    try {
      return await this.prisma.admin.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          name: keyword
            ? {
                contains: keyword,
                mode: 'insensitive',
              }
            : undefined,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve admins: ' + error.message);
    }
  }

  async create(data: CreateAdminDto & { tenantId: number; }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      return this.prisma.admin.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to create admin: ' + error.message);
    }
  }

  async findByUsernameOrEmail(identifier: string) {
    return this.prisma.admin.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });
  }

  async findByUsername(tenantId: number, username: string) {
    return this.prisma.admin.findUnique({
      where: { 
        username_tenantId: { 
          username, 
          tenantId 
        } 
      },
    });
  }

  async findById(tenantId: number | null, id: number) {
    return this.prisma.admin.findUnique({
      where: tenantId 
        ? { 
            id_tenantId: {
              id,
              tenantId
            }
          }
        : { id }
    });
  }

  async update(id: number, data: UpdateAdminDto) {
    try {
      const { ppwUsername, ppwPassword, ppwSiteId, ...adminData } = data;
      let updateData: any = { ...adminData };

      // Hash password if provided
      if (adminData.password) {
        updateData.password = await bcrypt.hash(adminData.password, 10);
      }

      // Find the tenant associated with this admin
      const admin = await this.prisma.admin.findUnique({
        where: { id },
        select: { tenantId: true }
      });

      if (!admin) {
        throw new BadRequestException('Admin not found');
      }

      // Validate PPW Site ID if provided
      if (ppwSiteId && !validateUUID(ppwSiteId)) {
        throw new BadRequestException('Invalid PPW Site ID. Must be a valid UUIDv4');
      }

      // Update tenant PPW configuration if fields are provided
      if (ppwUsername || ppwPassword || ppwSiteId) {
        const tenantUpdateData: any = {};

        if (ppwUsername) tenantUpdateData.ppwUsername = ppwUsername;
        
        if (ppwPassword) {
          // Hash PPW password with SHA1
          tenantUpdateData.ppwPasswordHash = crypto
            .createHash('sha1')
            .update(ppwPassword)
            .digest('hex');
        }
        
        if (ppwSiteId) tenantUpdateData.ppwSiteId = ppwSiteId;

        // Update tenant
        await this.prisma.tenant.update({
          where: { id: admin.tenantId },
          data: tenantUpdateData
        });
      }

      // Update admin
      return this.prisma.admin.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          password: true,
          role: true,
          tenant: {
            select: {
              ppwUsername: true,
              ppwSiteId: true
            }
          }
        }
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update admin: ' + error.message);
    }
  }

  // Add method to get PPW configuration
  async getPpwConfiguration(tenantId: number) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        ppwUsername: true,
        ppwSiteId: true
      }
    });
  }


  async delete(tenantId: number, id: number) {
    try {
      return this.prisma.admin.delete({
        where: { 
          id_tenantId: { 
            id, 
            tenantId 
          }
          } 
        },
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete admin: ' + error.message);
    }
  }

  async findByUsernameAcrossTenants(username: string) {
    return this.prisma.admin.findFirst({
      where: { 
        username: username.toLowerCase() // Optional: convert to lowercase for case-insensitive uniqueness
      },
    });
  }

}