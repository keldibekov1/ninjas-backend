// import {
//   ArrayMinSize,
//   IsArray,
//   IsNotEmpty,
//   IsNumber,
//   IsOptional,
//   IsString,
//   ValidateNested,
// } from 'class-validator';
// import { Type } from 'class-transformer';
// import IsArrayEnum from '../../../validators';
// import { Access } from '@prisma/client';
//
// export class CreateRolePermissionDto {
//   @IsNotEmpty()
//   @IsNumber()
//   id: number;
//
//   @IsArray()
//   @ArrayMinSize(1)
//   @IsArrayEnum(Access)
//   selectedAccessItems: Access[];
// }
//
// export class CreateRoleDto {
//   @IsNotEmpty()
//   @IsString()
//   name: string;
//
//   @IsArray()
//   @ArrayMinSize(1)
//   @ValidateNested({ each: true })
//   @Type(() => CreateRolePermissionDto)
//   permissions: CreateRolePermissionDto[];
// }
//
// // update
// export class UpdateRolePermissionDto extends CreateRolePermissionDto {
//   @IsOptional()
//   @IsNumber()
//   rolePermId: number;
// }
//
// export class UpdateRoleDto {
//   @IsOptional()
//   @IsString()
//   name: string;
//
//   @IsArray()
//   @IsOptional()
//   @ValidateNested({ each: true })
//   @Type(() => UpdateRolePermissionDto)
//   permissions: UpdateRolePermissionDto[];
// }
