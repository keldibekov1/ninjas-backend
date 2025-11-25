import { IsOptional, IsString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateFolderDocDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsInt()
  tenantId: number;
  

  @IsOptional()
  @IsInt()
  parentId?: number;
}
