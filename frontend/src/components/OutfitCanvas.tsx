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

const SLOT_CATEGORIES: ClothingCategory[] = ['model', 'top', 'bottom', 'shoes', 'accessories'];

const CATEGORY_LABEL: Record<ClothingCategory, string> = {
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  accessories: '액세서리',
  model: '모델',
};

const ITEM_SIZE: Record<ClothingCategory, { w: number; h: number }> = {
  top: { w: 220, h: 220 },
  bottom: { w: 200, h: 220 },
  shoes: { w: 160, h: 130 },
  accessories: { w: 120, h: 120 },
  model: { w: 240, h: 560 },
};

const DEFAULT_POSITION: Record<ClothingCategory, { x: number; y: number }> = {
  top: { x: (CANVAS_WIDTH - 220) / 2, y: 20 },
  bottom: { x: (CANVAS_WIDTH - 200) / 2, y: 250 },
  shoes: { x: (CANVAS_WIDTH - 160) / 2, y: 490 },
  accessories: { x: 20, y: 20 },
  model: { x: (CANVAS_WIDTH - 240) / 2, y: (CANVAS_HEIGHT - 560) / 2 },
};

const MIN_SIZE = 40;

interface PlacedItem {
  image: ClothingImage;
  position: { x: number; y: number };
  size: { w: number; h: number };
  z: number;
}

type Placements = Partial<Record<ClothingCategory, PlacedItem>>;

const zValues = (p: Placements): number[] =>
  Object.values(p)
    .filter((v): v is PlacedItem => Boolean(v))
    .map((v) => v.z);

const nextZ = (p: Placements) => {
  const zs = zValues(p);
  return zs.length === 0 ? 1 : Math.max(...zs) + 1;
};

const minZ = (p: Placements) => {
  const zs = zValues(p);
  return zs.length === 0 ? 0 : Math.min(...zs);
};

interface OutfitCanvasProps {
  onOutfitSaved?: () => void;
}

export default function OutfitCanvas({ onOutfitSaved }: OutfitCanvasProps) {
  const images = useOutfitStore((s) => s.images);
  const setImages = useOutfitStore((s) => s.setImages);
  const removeImage = useOutfitStore((s) => s.removeImage);
  const editingOutfit = useOutfitStore((s) => s.editingOutfit);
  const setEditingOutfit = useOutfitStore((s) => s.setEditingOutfit);

  const [outfitName, setOutfitName] = useState('내 코디');
  const [placements, setPlacements] = useState<Placements>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<ClothingCategory | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loadedEditIdRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    category: ClothingCategory;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resizeRef = useRef<{
    category: ClothingCategory;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
    aspect: number;
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

  // 편집 모드 — 저장된 코디를 캔버스 상태로 복원
  useEffect(() => {
    if (!editingOutfit) {
      loadedEditIdRef.current = null;
      return;
    }
    if (loadedEditIdRef.current === editingOutfit.id) return;
    if (images.length === 0) return; // 이미지 로드 대기

    const next: Placements = {};
    for (const item of editingOutfit.items ?? []) {
      const image = images.find((img) => img.id === item.clothingImageId);
      if (!image) continue;
      const cat = item.category as ClothingCategory;
      const baseSize = ITEM_SIZE[cat] ?? { w: 160, h: 160 };
      const pos = item.position as
        | { x?: number; y?: number; z?: number; w?: number; h?: number }
        | undefined;
      next[cat] = {
        image,
        position: { x: pos?.x ?? 0, y: pos?.y ?? 0 },
        size: { w: pos?.w ?? baseSize.w, h: pos?.h ?? baseSize.h },
        z: pos?.z ?? 1,
      };
    }
    setPlacements(next);
    setOutfitName(editingOutfit.name);
    setFeedback(null);
    loadedEditIdRef.current = editingOutfit.id;
  }, [editingOutfit, images]);

  const exitEditMode = () => {
    setEditingOutfit(null);
    setPlacements({});
    setOutfitName('내 코디');
    setFeedback(null);
  };

  const placedCount = useMemo(
    () => Object.values(placements).filter(Boolean).length,
    [placements],
  );

  const handleSelectImage = (image: ClothingImage) => {
    setPlacements((prev) => {
      const existing = prev[image.category];
      if (existing && existing.image.id === image.id) {
        const next = { ...prev };
        delete next[image.category];
        return next;
      }
      // 모델은 기본적으로 맨 뒤 레이어로 (옷이 모델 위에 올라가도록)
      const z = image.category === 'model' ? minZ(prev) - 1 : nextZ(prev);
      return {
        ...prev,
        [image.category]: {
          image,
          position: existing?.position ?? DEFAULT_POSITION[image.category],
          size: existing?.size ?? ITEM_SIZE[image.category],
          z,
        },
      };
    });
  };

  const bringToFront = (category: ClothingCategory) => {
    setPlacements((prev) => {
      const cur = prev[category];
      if (!cur) return prev;
      const top = Math.max(...zValues(prev));
      if (cur.z === top) return prev;
      return { ...prev, [category]: { ...cur, z: top + 1 } };
    });
  };

  const sendToBack = (category: ClothingCategory) => {
    setPlacements((prev) => {
      const cur = prev[category];
      if (!cur) return prev;
      const bottom = minZ(prev);
      if (cur.z === bottom) return prev;
      return { ...prev, [category]: { ...cur, z: bottom - 1 } };
    });
  };

  const handleClearSlot = (category: ClothingCategory) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleDeleteImage = async (image: ClothingImage) => {
    if (deletingId) return;
    if (!confirm(`이 ${CATEGORY_LABEL[image.category]} 이미지를 옷장에서 삭제할까요?`)) return;

    setDeletingId(image.id);
    setFeedback(null);

    // If this image is currently placed on canvas, remove the placement too
    setPlacements((prev) => {
      const placed = prev[image.category];
      if (placed?.image.id === image.id) {
        const next = { ...prev };
        delete next[image.category];
        return next;
      }
      return prev;
    });

    try {
      await imagesAPI.deleteImage(image.id);
      removeImage(image.id);
      setFeedback({ kind: 'ok', text: '옷장에서 삭제했습니다.' });
    } catch (e) {
      console.error('Failed to delete image', e);
      setFeedback({ kind: 'err', text: '삭제에 실패했습니다.' });
    } finally {
      setDeletingId(null);
    }
  };

  const clampToCanvas = (
    w: number,
    h: number,
    x: number,
    y: number,
  ): { x: number; y: number } => ({
    x: Math.max(0, Math.min(CANVAS_WIDTH - w, x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT - h, y)),
  });

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
    // Auto bring-to-front on grab so the dragged item is always visible
    bringToFront(category);
    e.preventDefault();
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const rawX = e.clientX - canvasRect.left - drag.offsetX;
    const rawY = e.clientY - canvasRect.top - drag.offsetY;
    setPlacements((prev) => {
      const cur = prev[drag.category];
      if (!cur) return prev;
      const next = clampToCanvas(cur.size.w, cur.size.h, rawX, rawY);
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

  const handleResizeStart = (
    e: PointerEvent<HTMLDivElement>,
    category: ClothingCategory,
  ) => {
    const placed = placements[category];
    if (!placed) return;
    e.stopPropagation();
    resizeRef.current = {
      category,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: placed.size.w,
      startH: placed.size.h,
      aspect: placed.size.w / placed.size.h,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    bringToFront(category);
    e.preventDefault();
  };

  const handleResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    const dx = e.clientX - r.startClientX;
    const dy = e.clientY - r.startClientY;
    // Lock aspect: scale based on the larger delta on the dominant axis
    const widthDriven = Math.abs(dx) >= Math.abs(dy);
    let nextW: number;
    let nextH: number;
    if (widthDriven) {
      nextW = r.startW + dx;
      nextH = nextW / r.aspect;
    } else {
      nextH = r.startH + dy;
      nextW = nextH * r.aspect;
    }

    setPlacements((prev) => {
      const cur = prev[r.category];
      if (!cur) return prev;
      // Constrain within canvas relative to current top-left
      const maxW = CANVAS_WIDTH - cur.position.x;
      const maxH = CANVAS_HEIGHT - cur.position.y;
      let w = Math.max(MIN_SIZE, Math.min(maxW, nextW));
      let h = Math.max(MIN_SIZE, Math.min(maxH, nextH));
      // Re-apply aspect after clamping
      if (widthDriven) h = w / r.aspect;
      else w = h * r.aspect;
      // One more clamp pass after aspect re-apply
      w = Math.max(MIN_SIZE, Math.min(maxW, w));
      h = Math.max(MIN_SIZE, Math.min(maxH, h));
      return {
        ...prev,
        [r.category]: { ...cur, size: { w, h } },
      };
    });
  };

  const handleResizeEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current) {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      resizeRef.current = null;
    }
  };

  const handleResetLayout = () => {
    setPlacements((prev) => {
      const next: Placements = {};
      (Object.entries(prev) as [ClothingCategory, PlacedItem][]).forEach(
        ([category, placed]) => {
          if (placed) {
            next[category] = {
              ...placed,
              position: DEFAULT_POSITION[category],
              size: ITEM_SIZE[category],
            };
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
          position: {
            x: Math.round(p.position.x),
            y: Math.round(p.position.y),
            z: p.z,
            w: Math.round(p.size.w),
            h: Math.round(p.size.h),
          },
        }));

      if (editingOutfit) {
        await outfitsAPI.updateOutfit(editingOutfit.id, {
          name: outfitName.trim(),
          items,
        });
        setFeedback({ kind: 'ok', text: '코디가 수정되었습니다.' });
        setEditingOutfit(null);
        loadedEditIdRef.current = null;
      } else {
        await outfitsAPI.createOutfit({ name: outfitName.trim(), items });
        setFeedback({ kind: 'ok', text: '코디가 저장되었습니다.' });
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(240px,300px)] gap-8">
      {/* Canvas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            placeholder="코디 이름"
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={handleResetLayout}
            disabled={placedCount === 0}
            className="px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-40"
          >
            기본 배치
          </button>
        </div>

        {editingOutfit && (
          <div className="rounded-lg bg-neutral-900 text-white px-3 py-2 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path d="M11 2l3 3-9 9H2v-3z" />
              </svg>
              수정 중 · <span className="font-medium">{editingOutfit.name}</span>
            </span>
            <button
              type="button"
              onClick={exitEditMode}
              className="text-white/70 hover:text-white underline underline-offset-2"
            >
              취소
            </button>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-lg px-3 py-2 text-sm border ${
              feedback.kind === 'ok'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
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
            className="relative bg-white border border-neutral-200 rounded-2xl overflow-hidden select-none shadow-sm"
          >
            {/* subtle grid backdrop */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {placedCount === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-xs tracking-wide pointer-events-none px-8 text-center">
                오른쪽 옷장에서 아이템을 선택하면<br />여기에 배치됩니다
              </div>
            )}

            {(Object.entries(placements) as [ClothingCategory, PlacedItem][])
              .filter((entry): entry is [ClothingCategory, PlacedItem] => Boolean(entry[1]))
              // 내부 z를 ascending 정렬해서 CSS zIndex는 1..N 으로 매핑.
              // 내부 z가 음수든 어디든 CSS는 항상 양수 → 캔버스 배경 뒤에 묻히는 일이 없다.
              .sort(([, a], [, b]) => a.z - b.z)
              .map(([category, placed], idx) => {
                const { w, h } = placed.size;
                const cssZ = idx + 1;
                return (
                  <div
                    key={category}
                    onPointerDown={(e) => handlePointerDown(e, category)}
                    style={{
                      left: placed.position.x,
                      top: placed.position.y,
                      width: w,
                      height: h,
                      zIndex: cssZ,
                    }}
                    className="absolute group cursor-grab active:cursor-grabbing touch-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={placed.image.imageUrl}
                      alt={CATEGORY_LABEL[category]}
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
                    />

                    {/* Z-order toolbar (top-left) */}
                    <div className="absolute -top-2 -left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        title="맨 앞으로"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => bringToFront(category)}
                        className="w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 flex items-center justify-center shadow-sm transition"
                        aria-label={`${CATEGORY_LABEL[category]} 맨 앞으로`}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="6" y="6" width="7" height="7" rx="1" fill="currentColor" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="맨 뒤로"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => sendToBack(category)}
                        className="w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 flex items-center justify-center shadow-sm transition"
                        aria-label={`${CATEGORY_LABEL[category]} 맨 뒤로`}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        >
                          <rect x="6" y="6" width="7" height="7" rx="1" />
                          <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" />
                        </svg>
                      </button>
                    </div>

                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => handleClearSlot(category)}
                      className="absolute -top-1 -right-1 bg-neutral-900 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      aria-label={`${CATEGORY_LABEL[category]} 제거`}
                    >
                      ✕
                    </button>

                    {/* Resize handle (bottom-right) */}
                    <div
                      onPointerDown={(e) => handleResizeStart(e, category)}
                      onPointerMove={handleResizeMove}
                      onPointerUp={handleResizeEnd}
                      onPointerCancel={handleResizeEnd}
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-[2px] bg-white border border-neutral-300 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition shadow-sm flex items-center justify-center touch-none"
                      aria-label={`${CATEGORY_LABEL[category]} 크기 조절`}
                    >
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        className="w-2 h-2 text-neutral-500"
                        aria-hidden="true"
                      >
                        <path d="M4 10l6-6M7 10l3-3" />
                      </svg>
                    </div>
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
          className="w-full py-3 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving
            ? editingOutfit
              ? '수정 중...'
              : '저장 중...'
            : placedCount === 0
              ? '아이템을 추가해 코디를 시작하세요'
              : editingOutfit
                ? `수정 적용 · ${placedCount}개 아이템`
                : `코디 저장 · ${placedCount}개 아이템`}
        </button>
      </div>

      {/* Wardrobe sidebar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">내 옷장</h3>
          <span className="text-[11px] text-neutral-400 tracking-widest uppercase">
            {filteredImages.length} · {activeFilter === 'all' ? 'all' : CATEGORY_LABEL[activeFilter]}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          >
            전체
          </FilterChip>
          {SLOT_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={activeFilter === c}
              onClick={() => setActiveFilter(c)}
            >
              {CATEGORY_LABEL[c]}
            </FilterChip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredImages.length === 0 && (
            <div className="col-span-2 py-12 text-center border border-dashed border-neutral-200 rounded-xl">
              <p className="text-xs text-neutral-400">업로드된 옷이 없습니다</p>
              <p className="text-[11px] text-neutral-300 mt-1">오른쪽에서 업로드 →</p>
            </div>
          )}
          {filteredImages.map((img) => {
            const placed = placements[img.category];
            const isActive = placed?.image.id === img.id;
            const isDeleting = deletingId === img.id;
            return (
              <div
                key={img.id}
                role="button"
                tabIndex={0}
                onClick={() => !isDeleting && handleSelectImage(img)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isDeleting) {
                    e.preventDefault();
                    handleSelectImage(img);
                  }
                }}
                aria-label={`${CATEGORY_LABEL[img.category]} 선택`}
                className={`relative aspect-square rounded-lg border bg-white overflow-hidden transition group cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900/10 ${
                  isActive
                    ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                    : 'border-neutral-200 hover:border-neutral-400'
                } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={img.tags?.join(', ') || img.category}
                  className="w-full h-full object-contain p-2"
                />
                <span
                  className={`absolute bottom-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white/80 text-neutral-600 group-hover:bg-white'
                  }`}
                >
                  {CATEGORY_LABEL[img.category]}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(img);
                  }}
                  disabled={isDeleting}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-neutral-200 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow-sm"
                  aria-label={`${CATEGORY_LABEL[img.category]} 옷장에서 삭제`}
                >
                  {isDeleting ? (
                    <span className="text-[10px] tracking-widest">···</span>
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                      aria-hidden="true"
                    >
                      <path d="M3 4h10M6 4V2.5h4V4M5 4l.6 9.5h4.8L11 4M7 6.5v5M9 6.5v5" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
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
      className={`px-2.5 py-1 text-xs rounded-full border transition ${
        active
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
      }`}
    >
      {children}
    </button>
  );
}
