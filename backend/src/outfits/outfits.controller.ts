import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OutfitsService } from './outfits.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';

@Controller('outfits')
@UseGuards(AuthGuard('jwt'))
export class OutfitsController {
  constructor(private outfitsService: OutfitsService) {}

  @Post()
  create(@Request() req, @Body() createOutfitDto: CreateOutfitDto) {
    return this.outfitsService.create(req.user.id, createOutfitDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.outfitsService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const outfit = await this.outfitsService.findById(id);
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (outfit.userId !== req.user.id) throw new ForbiddenException();
    return outfit;
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() createOutfitDto: CreateOutfitDto,
  ) {
    const outfit = await this.outfitsService.findById(id);
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (outfit.userId !== req.user.id) throw new ForbiddenException();
    return this.outfitsService.update(id, createOutfitDto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const outfit = await this.outfitsService.findById(id);
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (outfit.userId !== req.user.id) throw new ForbiddenException();
    await this.outfitsService.delete(id);
    return { success: true };
  }
}
