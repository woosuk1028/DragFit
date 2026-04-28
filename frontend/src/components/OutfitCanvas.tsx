'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { imagesAPI, outfitsAPI } from '@/lib/api';
import { useOutfitStore } from '@/lib/store';
import type { ClothingCategory, ClothingImage } from '@/types';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 640;

const SLOT_CATEGORIES: ClothingCategory[] = ['top', 'bottom', 'shoes', 'accessories'];

const CATEGORY_LABEL: Record<ClothingCategory, string> = {
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  accessories: '액세서리',
};

const ITEM_SIZE: Record<ClothingCategory, { w: number; h: number }> = {
  top: { w: 220, h: 220 },
  bottom: { w: 200, h: 220 },
  shoes: { w: 160, h: 130 },
  accessories: { w: 120, h: 120 },
};

const DEFAULT_POSITION: Record<ClothingCategory, { x: number; y: number }> = {
  top: { x: (CANVAS_WIDTH - 220) / 2, y: 20 },
  bottom: { x: (CANVAS_WIDTH - 200) / 2, y: 250 },
  shoes: { x: (CANVAS_WIDTH - 160) / 2, y: 490 },
  accessories: { x: 20, y: 20 },
};

interface PlacedItem {
  image: ClothingImage;
  position: { x: number; y: number };
}

type Placements = Partial<Record<ClothingCategory, PlacedItem>>;

interface OutfitCanvasProps {
  onOutfitSaved?: () => void;
}

export default function OutfitCanvas({ onOutfitSaved }: OutfitCanvasProps) {
  const images = useOutfitStore((s) => s.images);
  const setImages = useOutfitStore((s) => s.setImages);

  const [outfitName, setOutfitName] = useState('내 코디');
  const [placements, setPlacements] = useState<Placements>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<ClothingCategory | 'all'>('all');

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    category: ClothingCategory;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const loadImages = useCallback(async () => {
    try {
      const res = await imagesAPI.getImages();
      setImages(res.data);
    } catch (e) {
      console.error('Failed to load images', e);
    }
  }, [setImages]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const placedCount = useMemo(
    () => Object.values(placements).filter(Boolean).length,
    [placements],
  );

  const handleSelectImage = (image: ClothingImage) => {
    setPlacements((prev) => {
      const existing = prev[image.category];
      // If same image already placed → toggle off
      if (existing && existing.image.id === image.id) {
        const next = { ...prev };
        delete next[image.category];
        return next;
      }
      // Otherwise place at existing position (if swapping) or default
      return {
        ...prev,
        [image.category]: {
          image,
          position: existing?.position ?? DEFAULT_POSITION[image.category],
        },
      };
    });
  };

  const handleClearSlot = (category: ClothingCategory) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const clampToCanvas = (
    category: ClothingCategory,
    x: number,
    y: number,
  ): { x: number; y: number } => {
    const { w, h } = ITEM_SIZE[category];
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH - w, x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT - h, y)),
    };
  };

  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    category: ClothingCategory,
  ) => {
    if (!canvasRef.current) return;
    const placed = placements[category];
    if (!placed) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      category,
      offsetX: e.clientX - (canvasRect.left + placed.position.x),
      offsetY: e.clientY - (canvasRect.top + placed.position.y),
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const rawX = e.clientX - canvasRect.left - drag.offsetX;
    const rawY = e.clientY - canvasRect.top - drag.offsetY;
    const next = clampToCanvas(drag.category, rawX, rawY);
    setPlacements((prev) => {
      const cur = prev[drag.category];
      if (!cur) return prev;
      return { ...prev, [drag.category]: { ...cur, position: next } };
    });
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
    }
  };

  const handleResetLayout = () => {
    setPlacements((prev) => {
      const next: Placements = {};
      (Object.entries(prev) as [ClothingCategory, PlacedItem][]).forEach(
        ([category, placed]) => {
          if (placed) {
            next[category] = { ...placed, position: DEFAULT_POSITION[category] };
          }
        },
      );
      return next;
    });
  };

  const handleSave = async () => {
    if (placedCount === 0) {
      setFeedback({ kind: 'err', text: '한 가지 이상의 아이템을 캔버스에 올려주세요.' });
      return;
    }
    if (!outfitName.trim()) {
      setFeedback({ kind: 'err', text: '코디 이름을 입력해주세요.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const items = (Object.entries(placements) as [ClothingCategory, PlacedItem][])
        .filter(([, p]) => p)
        .map(([category, p]) => ({
          clothingImageId: p.image.id,
          category,
          position: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
        }));

      await outfitsAPI.createOutfit({ name: outfitName.trim(), items });
      setFeedback({ kind: 'ok', text: '코디가 저장되었습니다.' });
      setPlacements({});
      setOutfitName('내 코디');
      onOutfitSaved?.();
    } catch (e) {
      console.error('Failed to save outfit', e);
      setFeedback({ kind: 'err', text: '저장에 실패했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredImages = useMemo(
    () => (activeFilter === 'all' ? images : images.filter((i) => i.category === activeFilter)),
    [images, activeFilter],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(260px,320px)] gap-6">
      {/* Canvas */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            placeholder="코디 이름"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleResetLayout}
            disabled={placedCount === 0}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            기본 배치
          </button>
        </div>

        {feedback && (
          <div
            className={`rounded-md p-3 text-sm ${
              feedback.kind === 'ok'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="flex justify-center">
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            className="relative bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden select-none"
          >
            {placedCount === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                오른쪽 옷장에서 아이템을 선택하면 캔버스에 배치됩니다
              </div>
            )}

            {(Object.entries(placements) as [ClothingCategory, PlacedItem][]).map(
              ([category, placed]) => {
                if (!placed) return null;
                const { w, h } = ITEM_SIZE[category];
                return (
                  <div
                    key={category}
                    onPointerDown={(e) => handlePointerDown(e, category)}
                    style={{
                      left: placed.position.x,
                      top: placed.position.y,
                      width: w,
                      height: h,
                    }}
                    className="absolute group cursor-grab active:cursor-grabbing touch-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={placed.image.imageUrl}
                      alt={CATEGORY_LABEL[category]}
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none drop-shadow"
                    />
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => handleClearSlot(category)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      aria-label={`${CATEGORY_LABEL[category]} 제거`}
                    >
                      ✕
                    </button>
                    <span className="absolute -bottom-1 left-0 bg-white/80 text-gray-700 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                      {CATEGORY_LABEL[category]}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || placedCount === 0}
          className="w-full py-2.5 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : `코디 저장 (${placedCount})`}
        </button>
      </div>

      {/* Wardrobe sidebar */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">내 옷장</h3>

        <div className="flex flex-wrap gap-1.5">
          <FilterButton
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          >
            전체
          </FilterButton>
          {SLOT_CATEGORIES.map((c) => (
            <FilterButton
              key={c}
              active={activeFilter === c}
              onClick={() => setActiveFilter(c)}
            >
              {CATEGORY_LABEL[c]}
            </FilterButton>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredImages.length === 0 && (
            <p className="col-span-2 text-sm text-gray-400 italic text-center py-8">
              업로드된 옷이 없습니다.
            </p>
          )}
          {filteredImages.map((img) => {
            const placed = placements[img.category];
            const isActive = placed?.image.id === img.id;
            return (
              <button
                type="button"
                key={img.id}
                onClick={() => handleSelectImage(img)}
                className={`relative aspect-square rounded-md border-2 bg-white overflow-hidden transition ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.tags?.join(', ') || img.category}
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-1 py-0.5 text-center">
                  {CATEGORY_LABEL[img.category]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-full border ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
