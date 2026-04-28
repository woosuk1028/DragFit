import { create } from 'zustand';
import type { User, Outfit, ClothingImage, AuthResponse } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (response: AuthResponse) => void;
  hydrate: () => void;
  logout: () => void;
}

const STORAGE_KEY = 'accessToken';
const USER_KEY = 'authUser';

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (response: AuthResponse) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, response.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
    set({
      user: response.user,
      token: response.accessToken,
      isAuthenticated: true,
    });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(STORAGE_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

interface OutfitStore {
  currentOutfit: Outfit | null;
  outfits: Outfit[];
  images: ClothingImage[];
  editingOutfit: Outfit | null;
  setCurrentOutfit: (outfit: Outfit | null) => void;
  setOutfits: (outfits: Outfit[]) => void;
  setImages: (images: ClothingImage[]) => void;
  addImage: (image: ClothingImage) => void;
  removeImage: (imageId: string) => void;
  setEditingOutfit: (outfit: Outfit | null) => void;
}

export const useOutfitStore = create<OutfitStore>((set) => ({
  currentOutfit: null,
  outfits: [],
  images: [],
  editingOutfit: null,

  setCurrentOutfit: (outfit) => set({ currentOutfit: outfit }),
  setOutfits: (outfits) => set({ outfits }),
  setImages: (images) => set({ images }),
  addImage: (image) => set((state) => ({ images: [...state.images, image] })),
  removeImage: (imageId) =>
    set((state) => ({ images: state.images.filter((img) => img.id !== imageId) })),
  setEditingOutfit: (outfit) => set({ editingOutfit: outfit }),
}));
