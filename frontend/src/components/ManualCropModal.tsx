'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

interface ManualCropModalProps {
  file: File;
  onClose: () => void;
  onSave: (file: File) => void;
}

interface Point {
  x: number;
  y: number;
}

// 캔버스 픽셀이 너무 크면 메모리/성능에 부담이 가므로 입력을 다운스케일
const MAX_DIM = 1600;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
      img.src = url;
    });
  } finally {
    // Note: don't revoke yet — caller may still need it briefly. Caller revokes.
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

function fitToMaxDim(srcW: number, srcH: number) {
  const longest = Math.max(srcW, srcH);
  if (longest <= MAX_DIM) return { w: srcW, h: srcH };
  const scale = MAX_DIM / longest;
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

export default function ManualCropModal({ file, onClose, onSave }: ManualCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [hasPath, setHasPath] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [error, setError] = useState('');

  // Initial image load + canvas setup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(file);
        if (cancelled) return;
        const { w, h } = fitToMaxDim(img.naturalWidth, img.naturalHeight);
        const canvas = canvasRef.current;
        const overlay = overlayRef.current;
        if (!canvas || !overlay) return;
        canvas.width = w;
        canvas.height = h;
        overlay.width = w;
        overlay.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        imgRef.current = img;
        setIsReady(true);
      } catch (e) {
        console.error(e);
        setError('이미지를 불러오지 못했습니다');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const drawPath = useCallback((closed: boolean) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const pts = pointsRef.current;
    if (pts.length < 2) return;

    // dim outside the path
    if (closed && pts.length >= 3) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, overlay.width, overlay.height);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // path stroke
    ctx.save();
    ctx.lineWidth = Math.max(2, overlay.width / 400);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (closed) ctx.closePath();
    ctx.stroke();

    // dashed accent
    ctx.lineWidth = Math.max(1, overlay.width / 800);
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Translate pointer event to canvas-pixel coords
  const toCanvasCoords = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const overlay = overlayRef.current!;
    const rect = overlay.getBoundingClientRect();
    const scaleX = overlay.width / rect.width;
    const scaleY = overlay.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    e.preventDefault();
    drawingRef.current = true;
    pointsRef.current = [toCanvasCoords(e)];
    setHasPath(false);
    setIsApplied(false);
    drawPath(false);
    overlayRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = toCanvasCoords(e);
    const last = pointsRef.current[pointsRef.current.length - 1];
    // skip near-duplicate points to keep the path light
    if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 2) {
      pointsRef.current.push(pt);
      drawPath(false);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      overlayRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (pointsRef.current.length < 3) {
      pointsRef.current = [];
      drawPath(false);
      return;
    }
    setHasPath(true);
    drawPath(true);
  };

  const handleClear = () => {
    pointsRef.current = [];
    setHasPath(false);
    setIsApplied(false);
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
    }
  };

  const handleApply = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const pts = pointsRef.current;
    if (!canvas || !img || pts.length < 3) return;

    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    if (!rctx) return;

    rctx.save();
    rctx.beginPath();
    rctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) rctx.lineTo(pts[i].x, pts[i].y);
    rctx.closePath();
    rctx.clip();
    rctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    rctx.restore();

    const blob = await new Promise<Blob | null>((resolve) =>
      result.toBlob(resolve, 'image/png'),
    );
    if (!blob) {
      setError('이미지 생성에 실패했습니다');
      return;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const cropped = new File([blob], `${baseName}_cropped.png`, { type: 'image/png' });
    setIsApplied(true);
    onSave(cropped);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
              직접 누끼 따기
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              옷 모양을 따라 마우스로 한 번에 그려주세요. 그린 안쪽만 남습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md text-neutral-500 hover:bg-neutral-100 flex items-center justify-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-neutral-100">
          {error ? (
            <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <div
                className="relative inline-block bg-white shadow-sm rounded-md overflow-hidden"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="block max-w-full max-h-[60vh]"
                  style={{ maxWidth: '100%' }}
                />
                <canvas
                  ref={overlayRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute inset-0 max-w-full max-h-[60vh] cursor-crosshair touch-none"
                  style={{ maxWidth: '100%', width: '100%', height: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-neutral-200">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasPath && pointsRef.current.length === 0}
            className="px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-40"
          >
            다시 그리기
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!hasPath || isApplied}
              className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-40"
            >
              {isApplied ? '적용 완료' : '적용'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
