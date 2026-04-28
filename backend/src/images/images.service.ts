import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClothingImage } from './entities/clothing-image.entity';
import { CreateClothingImageDto } from './dto/create-clothing-image.dto';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(ClothingImage)
    private imagesRepository: Repository<ClothingImage>,
  ) {}

  async create(userId: string, createImageDto: CreateClothingImageDto, imageUrl: string) {
    const image = this.imagesRepository.create({
      userId,
      imageUrl,
      ...createImageDto,
    });
    return this.imagesRepository.save(image);
  }

  async findByUserId(userId: string, category?: string) {
    const query = this.imagesRepository.createQueryBuilder('image').where('image.userId = :userId', { userId });

    if (category) {
      query.andWhere('image.category = :category', { category });
    }

    return query.getMany();
  }

  async findById(id: string) {
    return this.imagesRepository.findOne({ where: { id } });
  }

  async delete(id: string) {
    return this.imagesRepository.delete(id);
  }
}
