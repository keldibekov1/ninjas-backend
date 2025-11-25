import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../../utils/permissions';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  public findById(id: number) {
    return PERMISSIONS.find((perm) => perm.id === id);
  }

  public findByName(name: string) {
    return PERMISSIONS.find((perm) => perm.name === name);
  }

  public getPermissions() {
    return PERMISSIONS;
  }
}
