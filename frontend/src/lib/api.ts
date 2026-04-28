import axios, { type AxiosInstance } from 'axios';
import type { AuthResponse, ClothingImage, Outfit } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');
    }
    return Promise.reject(error);
  },
);

export interface OutfitItemPayload {
  clothingImageId: string;
  category: string;
  position?: { x: number; y: number };
}

export interface CreateOutfitPayload {
  name: string;
  items?: OutfitItemPayload[];
}

export const authAPI = {
  signup: (email: string, password: string, name: string) =>
    api.post<AuthResponse>('/auth/signup', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
};

export const imagesAPI = {
  uploadImage: (file: File, category: string, tags: string[] = []) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (tags.length > 0) {
      formData.append('tags', tags.join(','));
    }
    return api.post<ClothingImage>('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getImages: (category?: string) =>
    api.get<ClothingImage[]>(`/images${category ? `?category=${category}` : ''}`),
  deleteImage: (imageId: string) => api.delete(`/images/${imageId}`),
};

export const outfitsAPI = {
  createOutfit: (outfit: CreateOutfitPayload) => api.post<Outfit>('/outfits', outfit),
  getOutfits: () => api.get<Outfit[]>('/outfits'),
  getOutfit: (outfitId: string) => api.get<Outfit>(`/outfits/${outfitId}`),
  updateOutfit: (outfitId: string, outfit: CreateOutfitPayload) =>
    api.put<Outfit>(`/outfits/${outfitId}`, outfit),
  deleteOutfit: (outfitId: string) => api.delete(`/outfits/${outfitId}`),
};

export default api;
