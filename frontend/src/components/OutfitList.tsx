'use client';

import { useCallback, useEffect, useState } from 'react';
import { imagesAPI, outfitsAPI } from '@/lib/api';
import { useOutfitStore } from '@/lib/store';
import type { ClothingImage, Outfit } from '@/types';

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 512;
const SOURCE_WIDTH = 400;
const SOURCE_HEIGHT = 640;

const SCALE_X = PREVIEW_WIDTH / SOURCE_WIDTH;
const SCALE_Y = PREVIEW_HEIGHT / SOURCE_HEIGHT;

const ITEM_SIZE_BASE: Record<string, { w: number; h: number }> = {
  top: { w: 220, h: 220 },
  bottom: { w: 200, h: 220 },
  shoes: { w: 160, h: 130 },
  accessories: { w: 120, h: 120 },
  model: { w: 240, h: 560 },
};

interface OutfitListProps {
  onEditRequest?: () => void;
}

export default function OutfitList({ onEditRequest }: OutfitListProps = {}) {
  const outfits = useOutfitStore((s) => s.outfits);
  const setOutfits = useOutfitStore((s) => s.setOutfits);
  const images = useOutfitStore((s) => s.images);
  const setImages = useOutfitStore((s) => s.setImages);
  const setEditingOutfit = useOutfitStore((s) => s.setEditingOutfit);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const handleEditOutfit = (outfit: Outfit) => {
    setEditingOutfit(outfit);
    onEditRequest?.();
  };

  const loadOutfits = useCallback(async () => {
    try {
      const res = await outfitsAPI.getOutfits();
      setOutfits(res.data);
    } catch (e) {
      console.error('Failed to load outfits', e);
    }
  }, [setOutfits]);

  useEffect(() => {
    loadOutfits();
    if (images.length === 0) {
      imagesAPI
        .getImages()
        .then((res) => setImages(res.data))
        .catch(() => {});
    }
  }, [loadOutfits, images.length, setImages]);

  const imageById = (id: string): ClothingImage | undefined =>
    images.find((img) => img.id === id);

  const handleDeleteOutfit = async (id: string) => {
    if (!confirm('이 코디를 삭제하시겠습니까?')) return;
    try {
      await outfitsAPI.deleteOutfit(id);
      await loadOutfits();
      setSelectedOutfit(null);
    } catch (e) {
      console.error('Failed to delete outfit', e);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">내 코디</h3>
          <span className="text-[11px] text-neutral-400 tracking-widest uppercase">
            {outfits.length} saved
          </span>
        </div>

        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {outfits.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-200 rounded-xl">
              <p className="text-sm text-neutral-400">아직 저장된 코디가 없습니다</p>
              <p className="text-[11px] text-neutral-300 mt-1">코디 만들기 탭에서 시작해보세요</p>
            </div>
          ) : (
            outfits.map((outfit) => {
              const isActive = selectedOutfit?.id === outfit.id;
              return (
                <button
                  type="button"
                  key={outfit.id}
                  onClick={() => setSelectedOutfit(outfit)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    isActive
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-neutral-900 truncate">
                        {outfit.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {new Date(outfit.createdAt).toLocaleDateString('ko-KR')} ·{' '}
                        {outfit.items?.length ?? 0}개 아이템
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-neutral-900 font-medium tracking-wider uppercase whitespace-nowrap">
                        선택됨
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">미리보기</h3>
        {selectedOutfit ? (
          <div className="space-y-3">
            <div
              className="relative bg-white border border-neutral-200 rounded-2xl overflow-hidden mx-auto shadow-sm"
              style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
            >
              {/* subtle grid */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {selectedOutfit.items?.length ? (
                selectedOutfit.items.map((item) => {
                  const img = imageById(item.clothingImageId);
                  const baseSize = ITEM_SIZE_BASE[item.category] ?? { w: 160, h: 160 };
                  const pos = item.position as
                    | { x: number; y: number; z?: number; w?: number; h?: number }
                    | undefined;
                  const x = pos?.x ?? 0;
                  const y = pos?.y ?? 0;
                  const w = pos?.w ?? baseSize.w;
                  const h = pos?.h ?? baseSize.h;
                  const z = pos?.z;
                  return (
                    <div
                      key={item.id}
                      style={{
                        left: x * SCALE_X,
                        top: y * SCALE_Y,
                        width: w * SCALE_X,
                        height: h * SCALE_Y,
                        zIndex: z,
                      }}
                      className="absolute"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.imageUrl}
                          alt={item.category}
                          className="w-full h-full object-contain drop-shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-300 bg-neutral-100/40 rounded">
                          이미지 없음
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">
                  비어있는 코디
                </div>
              )}
            </div>

            <div className="px-1">
              <p className="text-sm font-medium text-neutral-900">{selectedOutfit.name}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {new Date(selectedOutfit.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleEditOutfit(selectedOutfit)}
                className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition"
              >
                코디 수정
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOutfit(selectedOutfit.id)}
                className="px-4 py-2.5 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-50 transition"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          <div
            className="bg-white border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-300 text-xs mx-auto"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          >
            왼쪽에서 코디를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
