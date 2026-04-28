import { IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateClothingImageDto {
  @IsEnum(['top', 'bottom', 'shoes', 'accessories'])
  category: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
