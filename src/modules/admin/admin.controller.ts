import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto, UpdateAdminDto, LoginAdminDto } from './dto';
import * as bcrypt from 'bcrypt';
import { tokenGenerator } from 'src/utils/token-generator';
import { AuthGuard } from '../../guards';
import { PrismaService } from '../prisma/prisma.service';
import { ApiPpwService } from '../api-ppw/api-ppw.service';
import { AuthService } from '../auth/auth.service';

@Controller('admin')
export class AdminController {
  prisma: any;
  constructor(
    private readonly adminService: AdminService,
    private readonly prismaService: PrismaService,
    private readonly apiPpwService: ApiPpwService,
    private readonly authService: AuthService, 
  ) {}
  
  
  @Get('ppw-config')
  @UseGuards(AuthGuard)
  async getPpwConfiguration(@Req() req: Request) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
  
    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    
    const ppwConfig = await this.adminService.getPpwConfiguration(tenantId);
  
    return {
      message: 'PPW configuration retrieved successfully',
      config: {
        username: ppwConfig?.ppwUsername || null,
        siteId: ppwConfig?.ppwSiteId || null
      }
    };
  }

  @Post('ppw-test')
  @UseGuards(AuthGuard)
  async testPpwConnection(@Req() req: Request) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    
    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
    
    try {
      const response = await this.apiPpwService.getAll(tenantId);

      return {
        message: 'PPW connection test successful!',
        status: 'connected',
        totalOrders: response.data?.data?.length || 0
      };
    } catch (error) {
      // This will now properly throw an exception for connection/authentication failures
      throw new BadRequestException({
        message: 'PPW connection test failed',
        status: 'disconnected',
        error: error.message || 'Unknown connection error'
      });
    }
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAdmins(
    @Query('keyword') keyword: string,
    @Req() req: Request
  ) {
    try {
      // Check if the user is a global admin
      const isGlobalAdmin = req['globalAdmin'] !== undefined;

      // Extract tenantId from the authenticated user
      const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;
  
      const admins = await this.adminService.getAdmins(tenantId, keyword);

      return {
        message: 'Admins retrieved successfully!',
        admins,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to retrieve workers'
      );
    }
  }

  @Post('create')
  @UseGuards(AuthGuard)
  async createAdmin(
    @Body() data: CreateAdminDto, 
    @Req() req: Request
  ) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;
    
    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? data.tenantId : req['user']?.tenantId;

    // Validate tenantId for non-global admins
    if (!isGlobalAdmin && !tenantId) {
      throw new BadRequestException('Tenant ID is required for tenant admins');
    }

    // For global admins, ensure tenantId is provided from frontend
    if (isGlobalAdmin && !tenantId) {
      throw new BadRequestException('Tenant ID must be provided for global admin creation');
    }

    // Check username uniqueness within the specific tenant
    const findByUsername = await this.adminService.findByUsername(tenantId, data.username);
    if (findByUsername) {
      throw new BadRequestException('Admin with username already exists in this tenant!');
    }

    const createAdmin = await this.adminService.create({ 
      ...data, 
      tenantId 
    });

    return { 
      message: 'Admin created successfully!', 
      info: createAdmin 
    };
  }

@Post('login')
@HttpCode(HttpStatus.OK)
async loginAdmin(@Body() data: LoginAdminDto) {
  try {
    // Use the AuthService login method instead of handling login directly
    const result = await this.authService.login(data.username, data.password);
    
    return {
      message: `Welcome back, ${result.admin.name}`,
      info: result.admin,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
      throw error;
    }
    throw new InternalServerErrorException('Login failed: ' + error.message);
  }
}

  @Get('check-username/:username')
  async checkUsername(@Param('username') username: string, @Req() req: Request) {
    // Check username availability across all tenants
    const existingAdmin = await this.adminService.findByUsernameAcrossTenants(username);
    
    return {
      available: !existingAdmin
    };
  }

  @Get(':adminId')
  @UseGuards(AuthGuard)
  async getAdmin(@Param('adminId') adminId: string, @Req() req: Request) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const admin = await this.adminService.findById(tenantId, +adminId);

    if (!admin) {
      throw new BadRequestException(`Admin with ID ${adminId} not found!`);
    }

    delete admin.password;

    return {
      message: 'Admin retrieved successfully!',
      admin,
    };
  }

  @Put(':adminId')
  @UseGuards(AuthGuard)
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() data: UpdateAdminDto,
    @Req() req: Request
  ) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const admin = await this.adminService.findById(tenantId, +adminId);

    if (!admin) {
      throw new BadRequestException(`Admin with ID ${adminId} not found!`);
    }

    const updatedAdmin = await this.adminService.update(+adminId, data);

    delete updatedAdmin.password;

    return {
      message: 'Admin updated successfully!',
      info: updatedAdmin,
    };
  }

  @Delete(':adminId')
  @UseGuards(AuthGuard)
  async deleteAdmin(@Param('adminId') adminId: string, @Req() req: Request) {
    // Check if the user is a global admin
    const isGlobalAdmin = req['globalAdmin'] !== undefined;

    // Extract tenantId from the authenticated user
    const tenantId = isGlobalAdmin ? null : req['user']?.tenantId;

    const admin = await this.adminService.findById(tenantId, +adminId);

    if (!admin) {
      throw new BadRequestException(`Admin with ID ${adminId} not found!`);
    }

    await this.adminService.delete(tenantId, +adminId);

    return {
      message: `Admin with ID ${adminId} deleted successfully!`,
    };
  }
}