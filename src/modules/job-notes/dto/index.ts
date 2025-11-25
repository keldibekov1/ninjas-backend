import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';


export class FileMetadataDto {
  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;
}

export class CreateJobNotesDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  @IsNumber()
  report_id: number;

  @IsOptional()
  @IsNumber()
  tenantId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileMetadataDto)
  files?: FileMetadataDto[];

  @IsNotEmpty()
  @IsString()
  note_text: string;
}

export class UpdateJobNotesDto {
  @IsOptional()
  @IsNumber()
  report_id: number;

  @IsOptional()
  @IsString()
  note_text: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  deleteFileIds?: number[];
}
