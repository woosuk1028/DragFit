import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ImagesModule } from './images/images.module';
import { OutfitsModule } from './outfits/outfits.module';
import { User } from './users/entities/user.entity';
import { ClothingImage } from './images/entities/clothing-image.entity';
import { Outfit } from './outfits/entities/outfit.entity';
import { OutfitItem } from './outfits/entities/outfit-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'fashion_db',
      entities: [User, ClothingImage, Outfit, OutfitItem],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    PassportModule,
    AuthModule,
    UsersModule,
    ImagesModule,
    OutfitsModule,
  ],
})
export class AppModule {}
