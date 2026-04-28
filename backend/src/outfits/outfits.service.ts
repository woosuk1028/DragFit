import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Outfit } from './entities/outfit.entity';
import { OutfitItem } from './entities/outfit-item.entity';
import { CreateOutfitDto } from './dto/create-outfit.dto';

@Injectable()
export class OutfitsService {
  constructor(
    @InjectRepository(Outfit)
    private outfitsRepository: Repository<Outfit>,
    @InjectRepository(OutfitItem)
    private outfitItemsRepository: Repository<OutfitItem>,
  ) {}

  async create(userId: string, createOutfitDto: CreateOutfitDto) {
    const outfit = this.outfitsRepository.create({
      userId,
      name: createOutfitDto.name,
    });

    const savedOutfit = await this.outfitsRepository.save(outfit);

    if (createOutfitDto.items && createOutfitDto.items.length > 0) {
      const items = createOutfitDto.items.map((item) =>
        this.outfitItemsRepository.create({
          outfitId: savedOutfit.id,
          ...item,
        }),
      );
      await this.outfitItemsRepository.save(items);
    }

    return this.findById(savedOutfit.id);
  }

  async findByUserId(userId: string) {
    return this.outfitsRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.outfitsRepository.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async update(id: string, createOutfitDto: CreateOutfitDto) {
    await this.outfitsRepository.update(id, { name: createOutfitDto.name });

    if (createOutfitDto.items) {
      await this.outfitItemsRepository.delete({ outfitId: id });
      const items = createOutfitDto.items.map((item) =>
        this.outfitItemsRepository.create({
          outfitId: id,
          ...item,
        }),
      );
      await this.outfitItemsRepository.save(items);
    }

    return this.findById(id);
  }

  async delete(id: string) {
    return this.outfitsRepository.delete(id);
  }
}
