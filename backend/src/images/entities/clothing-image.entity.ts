import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clothing_images')
export class ClothingImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: ['top', 'bottom', 'shoes', 'accessories', 'model'],
  })
  category: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => User, (user) => user.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
