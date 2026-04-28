'use client';

import { useCallback, useEffect, useState } from 'react';
import { imagesAPI, outfitsAPI } from '@/lib/api';
import { useOutfitStore } from '@/lib/store';
import type { ClothingImage, Outfit } from '@/types';

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 512;
// Source canvas size from OutfitCanvas
const SOURCE_WIDTH = 400;
const SOURCE_HEIGHT = 640;

const SCALE_X = PREVIEW_WIDTH / SOURCE_WIDTH;
const SCALE_Y = PREVIEW_HEIGHT / SOURCE_HEIGHT;

const ITEM_SIZE_BASE: Record<string, { w: number; h: number }> = {
  top: { w: 220, h: 220 },
  bottom: { w: 200, h: 220 },
  shoes: { w: 160, h: 130 },
  accessories: { w: 120, h: 120 },
};

export default function OutfitList() {
  const outfits = useOutfitStore((s) => s.outfits);
  const setOutfits = useOutfitStore((s) => s.setOutfits);
  const images = useOutfitStore((s) => s.images);
  const setImages = useOutfitStore((s) => s.setImages);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">내 코디</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {outfits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">아직 저장된 코디가 없습니다.</p>
          ) : (
            outfits.map((outfit) => (
              <button
                type="button"
                key={outfit.id}
                onClick={() => setSelectedOutfit(outfit)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedOutfit?.id === outfit.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <p className="font-medium text-gray-900">{outfit.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(outfit.createdAt).toLocaleString('ko-KR')} ·{' '}
                  {outfit.items?.length ?? 0}개 아이템
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">미리보기</h3>
        {selectedOutfit ? (
          <div className="space-y-3">
            <div
              className="relative bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden mx-auto"
              style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
            >
              {selectedOutfit.items?.length ? (
                selectedOutfit.items.map((item) => {
                  const img = imageById(item.clothingImageId);
                  const size = ITEM_SIZE_BASE[item.category] ?? { w: 160, h: 160 };
                  const pos = item.position ?? { x: 0, y: 0 };
                  return (
                    <div
                      key={item.id}
                      style={{
                        left: pos.x * SCALE_X,
                        top: pos.y * SCALE_Y,
                        width: size.w * SCALE_X,
                        height: size.h * SCALE_Y,
                      }}
                      className="absolute"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img.imageUrl}
                          alt={item.category}
                          className="w-full h-full object-contain drop-shadow"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 bg-gray-200/40 rounded">
                          이미지 없음
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  비어있는 코디
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDeleteOutfit(selectedOutfit.id)}
              className="w-full py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
            >
              코디 삭제
            </button>
          </div>
        ) : (
          <div
            className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 mx-auto"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          >
            왼쪽에서 코디를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
