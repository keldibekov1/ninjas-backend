import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { AccessLevelType, PermissionCategoryType } from '../types';

export const Admin = createParamDecorator(
  (data: any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.admin;
  },
);

export const Permission = (
  name: PermissionCategoryType,
  accessLevels: AccessLevelType[],
) => {
  return SetMetadata('permission', {
    category: name,
    accessLevels,
  });
};
