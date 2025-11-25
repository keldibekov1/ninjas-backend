    import { Transform } from 'class-transformer';
import {IsOptional, IsInt, IsNotEmpty, IsNumber, Min, IsString } from 'class-validator';



    export class GetTaskitemsDto {
    @IsOptional()
    @IsInt()
    id?: number;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    keyword?: string;  // Changed from search to keyword to match the working pattern
  
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    page?: number;
  
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    limit?: number;
  
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    taskItemId?: number;
    } 

    export class UpdateTaskitemsDto {
    @IsInt()
    @IsNotEmpty()
    id: number;

    @IsNotEmpty()
    item_name: string;

    @IsOptional()
    @IsNumber() 
    price?: number;

    @IsNotEmpty()
    @IsNumber() 
    tenantId: number;
    }

    export class AddTaskitemsDto {

    @IsNotEmpty()
    item_name: string;
    
    @IsOptional()
    @IsNumber() 
    price?: number;
        
    @IsNotEmpty()
    @IsNumber() 
    tenantId: number;
    }
    

    export class DeleteTaskitemsDto {
    @IsInt() 
    @IsNotEmpty()
    id: number; 


    }
