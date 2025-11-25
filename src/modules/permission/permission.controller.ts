import { Controller, Get } from '@nestjs/common';
import { PermissionService } from './permission.service';

@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  GetPermissions() {
    const permissions = this.permissionService.getPermissions();

    return {
      message: 'Permissions list are retrieved successfully!',
      permissions,
    };
  }
}
