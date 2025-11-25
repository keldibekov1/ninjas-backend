import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
  InternalServerErrorException,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MapsService } from './maps.service';
import { CreateMapAreaDto } from './dto/create-map-area.dto';
import { UpdateMapAreaDto } from './dto/update-map-area.dto';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('maps')
@UseGuards(AuthGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createMapAreaDto: CreateMapAreaDto, @Req() req: Request) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;
      
      // Validate user exists
      if (!req['user']?.id) {
        throw new BadRequestException('User authentication required - no user ID found');
      }

      // Extract tenantId based on user type
      let tenantId: number;
      
      if (isGlobalAdmin) {
        // For global admin, tenantId must be provided in the request
        if (!createMapAreaDto.tenantId) {
          throw new BadRequestException('Tenant ID must be provided for global admin map area creation');
        }
        tenantId = Number(createMapAreaDto.tenantId);
      } else {
        // For regular users, use their tenantId
        if (!req['user']?.tenantId) {
          throw new BadRequestException('User tenant ID not found');
        }
        tenantId = Number(req['user'].tenantId);
      }

      // Validate tenantId is a valid number
      if (isNaN(tenantId) || tenantId <= 0) {
        throw new BadRequestException('Invalid tenant ID');
      }

      // Validate and convert user ID
      const userId = Number(req['user'].id);
      if (isNaN(userId) || userId <= 0) {
        throw new BadRequestException('Invalid user ID');
      }

      // Validate geometry
      await this.mapsService.validateGeometry(createMapAreaDto.geometry);

      // Check for overlapping areas
      const overlapping = await this.mapsService.findOverlapping(
        createMapAreaDto.geometry,
        tenantId
      );

      if (overlapping.length > 0) {
        return {
          success: false,
          message: 'The new area overlaps with existing areas',
          overlappingAreas: overlapping
        };
      }

      // Prepare final DTO with proper types
      const finalDto: CreateMapAreaDto = {
        ...createMapAreaDto,
        tenantId: tenantId,
        createdBy: userId,
        area_size: Number(createMapAreaDto.area_size)
      };

      const mapArea = await this.mapsService.create(finalDto);

      return {
        success: true,
        message: 'Map area created successfully',
        data: mapArea
      };
    } catch (error) {
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Handle validation errors
      if (error.response && error.response.message) {
        throw new BadRequestException(error.response.message);
      }
      
      throw new InternalServerErrorException(
        error.message || 'Failed to create map area'
      );
    }
  }

  @Get()
  async findAll(@Req() req: Request) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : Number(req['user']?.tenantId);

      const areas = await this.mapsService.findAll(tenantId);
      
      return {
        success: true,
        message: 'Map areas retrieved successfully',
        data: areas
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to retrieve map areas'
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : Number(req['user']?.tenantId);

      const area = await this.mapsService.findOne(id, tenantId);
      
      return {
        success: true,
        message: 'Map area retrieved successfully',
        data: area
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to retrieve map area'
      );
    }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMapAreaDto: UpdateMapAreaDto,
    @Req() req: Request
  ) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : Number(req['user']?.tenantId);

      if (updateMapAreaDto.geometry) {
        // Validate new geometry
        await this.mapsService.validateGeometry(updateMapAreaDto.geometry);

        // For overlap checking, we need the actual tenantId
        let checkTenantId = tenantId;
        if (isGlobalAdmin) {
          const existingArea = await this.mapsService.findOne(id, null);
          checkTenantId = existingArea.tenantId;
        }

        // Check for overlapping areas, excluding the current area
        const overlapping = await this.mapsService.findOverlapping(
          updateMapAreaDto.geometry,
          checkTenantId,
          id,
        );

        if (overlapping.length > 0) {
          return {
            success: false,
            message: 'The updated area overlaps with existing areas',
            overlappingAreas: overlapping
          };
        }
      }

      const updated = await this.mapsService.update(id, tenantId, updateMapAreaDto);
      
      return {
        success: true,
        message: 'Map area updated successfully',
        data: updated
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to update map area'
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : Number(req['user']?.tenantId);

      await this.mapsService.remove(id, tenantId);
      
      return {
        success: true,
        message: 'Map area deleted successfully'
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to delete map area'
      );
    }
  }
}