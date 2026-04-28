import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateOutfitDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  items?: Array<{
    clothingImageId: string;
    category: string;
    position?: { x: number; y: number };
  }>;
}
