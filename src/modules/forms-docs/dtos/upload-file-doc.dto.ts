import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDocDto {
  @Transform(({ value }) => parseInt(value, 10)) // Transform string to number
  @IsNumber({}, { message: 'folderId must be a number' }) // Validate as a number
  @IsNotEmpty()
  folderId: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  @IsInt()
  tenantId: number;
  
  @IsOptional()
  @IsString()
  name: string;

}
