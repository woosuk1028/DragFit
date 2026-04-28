import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const UPLOAD_DIR = 'uploads';

export const multerOptions = {
  storage: diskStorage({
    destination: `./${UPLOAD_DIR}`,
    filename: (_req, file, cb) => {
      const randomName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, randomName);
    },
  }),
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!file.mimetype.match(/^image\/(jpe?g|png|gif|webp)$/)) {
      cb(new BadRequestException('Only image files are allowed'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
