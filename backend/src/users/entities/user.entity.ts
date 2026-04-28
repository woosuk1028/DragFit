import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ClothingImage } from '../../images/entities/clothing-image.entity';
import { Outfit } from '../../outfits/entities/outfit.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ClothingImage, (image) => image.user, { cascade: true })
  images: ClothingImage[];

  @OneToMany(() => Outfit, (outfit) => outfit.user, { cascade: true })
  outfits: Outfit[];
}
