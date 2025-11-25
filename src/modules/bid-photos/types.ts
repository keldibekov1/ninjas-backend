import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';

export type TaskItemType = string;

export class MovePhotosDto {
    @IsArray()
    @IsNumber({}, { each: true })
    photoIds: number[];
  
    @IsString()
    targetTaskId: string;
  }

  export class UploadPhotosDto {
    @IsArray()
    @IsString({ each: true }) 
    metadata?: string[]; 
  }

  export interface archivePhotos {
    photoIds: number[];
  }

  export class DeletePhotosDto {
    photoIds: number[];
  }