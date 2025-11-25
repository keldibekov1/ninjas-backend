// import {
//   BadRequestException,
//   Body,
//   Controller,
//   Delete,
//   Get,
//   NotFoundException,
//   Param,
//   Post,
//   Put,
// } from '@nestjs/common';
// import { RoleService } from './role.service';
// import { CreateRoleDto, UpdateRoleDto } from './dto';
// import { PermissionService } from '../permission/permission.service';
//
// @Controller('role')
// export class RoleController {
//   constructor(
//     private readonly roleService: RoleService,
//     private readonly permissionService: PermissionService,
//   ) {}
//
//   @Post()
//   async CreateRole(@Body() createRoleDto: CreateRoleDto) {
//     for (const permission of createRoleDto.permissions) {
//       const findPermById = this.permissionService.findById(permission.id);
//       if (!findPermById) {
//         throw new NotFoundException(
//           `Permission with Id ${permission.id} is not found!`,
//         );
//       }
//
//       for (const accessItem of permission.selectedAccessItems) {
//         if (!findPermById.allowedAccesses.includes(accessItem)) {
//           throw new BadRequestException(
//             `${accessItem} is not allowed to permission (ID:${permission.id})`,
//           );
//         }
//       }
//     }
//
//     const findRoleByName = await this.roleService.findRoleByName(
//       createRoleDto.name,
//     );
//     if (findRoleByName) {
//       throw new BadRequestException(
//         `Role with name ${createRoleDto.name} is already existed!`,
//       );
//     }
//
//     // create role
//     const createRole = await this.roleService.createRole(createRoleDto.name);
//
//     // create role permission
//     for (const permission of createRoleDto.permissions) {
//       const createRolePermission = await this.roleService.createRolePermission(
//         createRole.id,
//         permission.id,
//         permission.selectedAccessItems,
//       );
//     }
//
//     return {
//       message: `Role is created successfully.`,
//       info: createRole,
//     };
//   }
//
//   @Put(':roleId')
//   async UpdateRole(
//     @Param('roleId') roleId: string,
//     @Body() updateRoleDto: UpdateRoleDto,
//   ) {
//     const findRole = await this.roleService.findRoleById(+roleId);
//     if (!findRole) {
//       throw new NotFoundException(`role with id ${roleId} is not found!`);
//     }
//
//     // update role info
//     const updateRole = await this.roleService.updateRole(
//       +roleId,
//       updateRoleDto.name,
//     );
//
//     if (updateRoleDto.permissions) {
//       for (const permission of updateRoleDto.permissions) {
//         const findPermById = this.permissionService.findById(permission.id);
//         if (!findPermById) {
//           throw new NotFoundException(
//             `Permission with Id ${permission.id} is not found!`,
//           );
//         }
//
//         if (permission.rolePermId) {
//           const findByRolePermId = await this.roleService.findByRolePermId(
//             permission.rolePermId,
//           );
//           if (!findByRolePermId) {
//             throw new NotFoundException(
//               `RolePermission with Id ${permission.rolePermId} is not found!`,
//             );
//           }
//         }
//
//         for (const accessItem of permission.selectedAccessItems) {
//           if (!findPermById.allowedAccesses.includes(accessItem)) {
//             throw new BadRequestException(
//               `${accessItem} is not allowed to permission (ID:${permission.id})`,
//             );
//           }
//         }
//
//         if (!permission.rolePermId) {
//           await this.roleService.createRolePermission(
//             +roleId,
//             permission.id,
//             permission.selectedAccessItems,
//           );
//         } else {
//           await this.roleService.updateRolePermission(
//             permission.rolePermId,
//             +roleId,
//             permission.id,
//             permission.selectedAccessItems,
//           );
//         }
//       }
//     }
//
//     return {
//       message: 'Role is updated successfully!',
//       info: updateRole,
//     };
//   }
//
//   @Get()
//   async GetRoles() {
//     const roles = await this.roleService.getRoles();
//
//     const formattedRoles = roles.map((role) => ({
//       ...role,
//       permissions: role.permissions.map((rolePerm) => {
//         const rolePermId = rolePerm.id;
//         delete rolePerm.id;
//         return {
//           rolePermId,
//           ...rolePerm,
//         };
//       }),
//     }));
//
//     return {
//       message: `Roles info is retrieved successfully!`,
//       roles: formattedRoles,
//     };
//   }
//
//   @Get(':roleId')
//   async GetRoleById(@Param('roleId') roleId: string) {
//     const findRole = await this.roleService.findRoleById(+roleId, true);
//     if (!findRole) {
//       throw new NotFoundException(`Role with Id ${roleId} is not found!`);
//     }
//
//     const formattedRoleInfo = findRole.permissions.map((rolePerm) => {
//       const rolePermId = rolePerm.id;
//       delete rolePerm.id;
//       return {
//         rolePermId,
//         ...rolePerm,
//       };
//     });
//
//     return {
//       message: `Role info with Id ${roleId}`,
//       info: {
//         id: findRole.id,
//         name: findRole.name,
//         createdAt: findRole.createdAt,
//         updatedAt: findRole.updatedAt,
//         permissions: formattedRoleInfo,
//       },
//     };
//   }
//
//   @Delete(':id')
//   async DeleteRole(@Param('id') id: string) {
//     const findRole = await this.roleService.findRoleById(+id);
//     if (!findRole) {
//       throw new NotFoundException(`role with id ${id} is not found!`);
//     }
//
//     // delete role
//     await this.roleService.deleteRole(+id);
//
//     return {
//       message: `Role is deleted successfully!`,
//       ID: +id,
//     };
//   }
// }
