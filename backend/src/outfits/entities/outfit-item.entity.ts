import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Outfit } from './outfit.entity';

@Entity('outfit_items')
export class OutfitItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  outfitId: string;

  @Column()
  clothingImageId: string;

  @Column({
    type: 'enum',
    enum: ['top', 'bottom', 'shoes', 'accessories', 'model'],
  })
  category: string;

  @Column({ type: 'json', nullable: true })
  position?: { x: number; y: number };

  @ManyToOne(() => Outfit, (outfit) => outfit.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outfitId' })
  outfit: Outfit;
}
