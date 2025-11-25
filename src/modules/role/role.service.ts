// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { Access } from '@prisma/client';
//
// @Injectable()
// export class RoleService {
//   constructor(private readonly prisma: PrismaService) {}
//
//   public createRole(name: string) {
//     return this.prisma.role.create({
//       data: {
//         name,
//       },
//     });
//   }
//
//   public createRolePermission(
//     roleId: number,
//     permId: number,
//     accessibility: Access[],
//   ) {
//     return this.prisma.rolePermission.create({
//       data: {
//         roleId,
//         permId,
//         accessibility,
//       },
//     });
//   }
//
//   public updateRolePermission(
//     rolePermId: number,
//     roleId: number,
//     permId: number,
//     accessibility: Access[],
//   ) {
//     return this.prisma.rolePermission.update({
//       where: {
//         id: rolePermId,
//       },
//       data: {
//         roleId,
//         permId,
//         accessibility,
//       },
//     });
//   }
//
//   public findRoleById(roleId: number, includePermissions: boolean = false) {
//     return this.prisma.role.findUnique({
//       where: {
//         id: roleId,
//       },
//       include: {
//         permissions: includePermissions,
//       },
//     });
//   }
//
//   public findByRolePermId(rolePermId: number) {
//     return this.prisma.rolePermission.findUnique({
//       where: {
//         id: rolePermId,
//       },
//     });
//   }
//
//   public findRoleByName(name: string, includePermissions: boolean = false) {
//     return this.prisma.role.findUnique({
//       where: {
//         name,
//       },
//     });
//   }
//
//   public getRoles() {
//     return this.prisma.role.findMany({
//       orderBy: {
//         createdAt: 'desc',
//       },
//       include: {
//         permissions: true,
//       },
//     });
//   }
//
//   public updateRole(roleId: number, name: string) {
//     return this.prisma.role.update({
//       where: {
//         id: roleId,
//       },
//       data: {
//         name,
//       },
//     });
//   }
//
//   public deleteRole(id: number) {
//     return this.prisma.role.delete({
//       where: {
//         id,
//       },
//     });
//   }
// }
