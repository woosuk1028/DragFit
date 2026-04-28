export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type ClothingCategory = 'top' | 'bottom' | 'shoes' | 'accessories' | 'model';

export interface ClothingImage {
  id: string;
  userId: string;
  imageUrl: string;
  category: ClothingCategory;
  tags: string[];
  uploadedAt: string;
}

export interface OutfitItem {
  id: string;
  outfitId: string;
  clothingImageId: string;
  category: ClothingCategory;
  position?: { x: number; y: number; z?: number; w?: number; h?: number };
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  rating?: number;
  items: OutfitItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
