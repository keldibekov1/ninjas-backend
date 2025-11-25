import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';

export type TaskItemType = string;

class MovePhotosDto {
    @IsArray()
    photoIds: number[];
  
    @IsString()
    targetTaskId: string;
  }


  export class UploadPhotosDto {
    @IsArray()
    @IsString({ each: true }) // Each item in the array must be a string
    metadata?: string[]; // Optional metadata field
  }