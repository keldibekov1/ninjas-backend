import { RoleEnum } from '@prisma/client';

export type JwtPayloadType = {
  info: {
    id: number;
    tenantId?: number;
    name: string | null;
    username: string | null;
    password: string | null;
    role: RoleEnum | null;
    createdAt: string;
    updatedAt: string;
  };
  iat: number;
  exp: number;
};

export type PermissionCategoryType =
  | 'DASHBOARD'
  | 'WORK_ORDER'
  | 'ADMINS_MANAGEMENT'
  | 'WORKERS_MANAGEMENT'
  | 'PRICE'
  | 'TASK';

export type AccessLevelType = 'READ' | 'WRITE' | 'EDIT' | 'DELETE';

export type PermissionType = {
  category: PermissionCategoryType;
  accessLevels: AccessLevelType[];
};
