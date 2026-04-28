import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { multerOptions } from '../common/multer.options';

@Controller('images')
@UseGuards(AuthGuard('jwt'))
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category?: string; tags?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!body.category) {
      throw new BadRequestException('Category is required');
    }
    if (!['top', 'bottom', 'shoes', 'accessories', 'model'].includes(body.category)) {
      throw new BadRequestException('Invalid category');
    }

    const tags = body.tags
      ? body.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const imageUrl = `/uploads/${file.filename}`;
    return this.imagesService.create(
      req.user.id,
      { category: body.category, tags },
      imageUrl,
    );
  }

  @Get()
  async getImages(@Request() req, @Query('category') category?: string) {
    return this.imagesService.findByUserId(req.user.id, category);
  }

  @Get(':id')
  async getImage(@Request() req, @Param('id') id: string) {
    const image = await this.imagesService.findById(id);
    if (!image) throw new NotFoundException('Image not found');
    if (image.userId !== req.user.id) throw new ForbiddenException();
    return image;
  }

  @Delete(':id')
  async deleteImage(@Request() req, @Param('id') id: string) {
    const image = await this.imagesService.findById(id);
    if (!image) throw new NotFoundException('Image not found');
    if (image.userId !== req.user.id) throw new ForbiddenException();
    await this.imagesService.delete(id);
    return { success: true };
  }
}
