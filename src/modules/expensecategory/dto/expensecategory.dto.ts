import { IsOptional, IsInt, IsNotEmpty, IsString, IsBoolean } from 'class-validator';

export class GetExpenseCategoriesDto {
  @IsOptional()
  @IsInt()
  id?: number;

  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export class UpdateExpenseCategoriesDto {
  @IsInt()
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddExpenseCategoriesDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class DeleteExpenseCategoriesDto {
  @IsInt() 
  @IsNotEmpty()
  id: number;
}