import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMapAreaDto } from './dto/create-map-area.dto';
import { UpdateMapAreaDto } from './dto/update-map-area.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MapsService {
  constructor(private prisma: PrismaService) {}

  async create(createMapAreaDto: CreateMapAreaDto) {
    try {
      return await this.prisma.mapArea.create({
        data: {
          geometry: createMapAreaDto.geometry,
          areaSize: createMapAreaDto.area_size,
          name: createMapAreaDto.name,
          description: createMapAreaDto.description,
          tenantId: createMapAreaDto.tenantId,
          createdBy: createMapAreaDto.createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('A map area with these properties already exists');
        }
      }
      throw error;
    }
  }

  async findAll(tenantId: number | null) {
    const whereClause: any = {
      isActive: true,
    };

    // Only filter by tenantId if it's provided (not global admin)
    if (tenantId !== null) {
      whereClause.tenantId = tenantId;
    }

    return await this.prisma.mapArea.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, tenantId: number | null) {
    const whereClause: any = {
      id,
      isActive: true,
    };

    // Only filter by tenantId if it's provided (not global admin)
    if (tenantId !== null) {
      whereClause.tenantId = tenantId;
    }

    const mapArea = await this.prisma.mapArea.findFirst({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!mapArea) {
      throw new NotFoundException('Map area not found');
    }

    return mapArea;
  }

  async update(id: number, tenantId: number | null, updateMapAreaDto: UpdateMapAreaDto) {
    try {
      const whereClause: any = { id };
      
      // Only filter by tenantId if it's provided (not global admin)
      if (tenantId !== null) {
        whereClause.tenantId = tenantId;
      }

      return await this.prisma.mapArea.update({
        where: whereClause,
        data: {
          geometry: updateMapAreaDto.geometry,
          name: updateMapAreaDto.name,
          description: updateMapAreaDto.description,
          isActive: updateMapAreaDto.isActive,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Map area not found');
        }
      }
      throw error;
    }
  }

  async remove(id: number, tenantId: number | null) {
    try {
      const whereClause: any = { id };
      
      // Only filter by tenantId if it's provided (not global admin)
      if (tenantId !== null) {
        whereClause.tenantId = tenantId;
      }

      await this.prisma.mapArea.update({
        where: whereClause,
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Map area not found');
        }
      }
      throw error;
    }
  }

  async findOverlapping(
    geometry: any, 
    tenantId: number, 
    excludeId?: number
  ): Promise<any[]> {
    // Ensure tenantId is provided for overlap checking
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required for overlap checking');
    }

    const overlappingAreas = await this.prisma.$queryRaw`
      SELECT * FROM map_areas
      WHERE tenant_id = ${tenantId}
      AND is_active = true
      ${excludeId ? Prisma.sql`AND id != ${excludeId}` : Prisma.empty}
      AND ST_Intersects(
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326),
        ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326)
      );
    ` as any[]; 
      
    return overlappingAreas;
  }

  async validateGeometry(geometry: any): Promise<boolean> {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      throw new BadRequestException('Invalid geometry format');
    }

    if (geometry.type !== 'Polygon') {
      throw new BadRequestException('Only Polygon geometries are supported');
    }

    // Additional geometry validation can be added here
    return true;
  }
}