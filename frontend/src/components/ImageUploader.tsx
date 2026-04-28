'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { imagesAPI } from '@/lib/api';
import { useOutfitStore } from '@/lib/store';
import type { ClothingCategory } from '@/types';
import ManualCropModal from './ManualCropModal';

interface ImageUploaderProps {
  onImageUploaded?: () => void;
}

const CATEGORIES: { value: ClothingCategory; label: string }[] = [
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'accessories', label: '액세서리' },
];

type BgState =
  | 'idle'
  | 'loading-model'
  | 'processing'
  | 'done'
  | 'too-empty'
  | 'error';

// 처리 결과의 불투명 픽셀 비율을 측정 — 너무 적으면 "다 지워진 것"으로 판단
async function measureOpaqueRatio(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(1);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let opaque = 0;
        const total = canvas.width * canvas.height;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 32) opaque++;
        }
        URL.revokeObjectURL(url);
        resolve(opaque / total);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('failed to load image'));
    };
    img.src = url;
  });
}

const MIN_OPAQUE_RATIO = 0.02; // 2% 미만이면 거의 다 지워진 것

export default function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [emptyProcessedFile, setEmptyProcessedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [autoBgRemove, setAutoBgRemove] = useState(true);
  const [bgState, setBgState] = useState<BgState>('idle');
  const [bgProgress, setBgProgress] = useState(0);
  const [opaqueRatio, setOpaqueRatio] = useState<number | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory>('top');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const addImage = useOutfitStore((state) => state.addImage);

  // 우선순위: 직접 누끼 > 자동 누끼 (토글 ON일 때) > 원본
  const displayFile =
    manualFile ?? (autoBgRemove ? processedFile ?? originalFile : originalFile);
  const fileToUpload = displayFile;

  useEffect(() => {
    if (!displayFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(displayFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [displayFile]);

  const resetAll = () => {
    setOriginalFile(null);
    setProcessedFile(null);
    setEmptyProcessedFile(null);
    setManualFile(null);
    setBgState('idle');
    setBgProgress(0);
    setOpaqueRatio(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runBgRemoval = async (file: File) => {
    setBgState('loading-model');
    setBgProgress(0);
    setOpaqueRatio(null);
    setEmptyProcessedFile(null);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(file, {
        // isnet (full fp32) → isnet_fp16 보다 정확. 흰옷/저대비에서 더 잘 잡음
        model: 'isnet',
        progress: (key, current, total) => {
          if (total > 0) {
            setBgProgress(Math.round((current / total) * 100));
          }
          if (key.startsWith('compute')) {
            setBgState('processing');
          }
        },
        output: { format: 'image/png' },
      });

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      const processed = new File([blob], `${baseName}_nobg.png`, { type: 'image/png' });

      // 결과가 거의 비어있으면 (흰옷/저대비 케이스) 자동 적용 안 함
      const ratio = await measureOpaqueRatio(blob);
      setOpaqueRatio(ratio);

      if (ratio < MIN_OPAQUE_RATIO) {
        setEmptyProcessedFile(processed);
        setProcessedFile(null);
        setBgState('too-empty');
      } else {
        setProcessedFile(processed);
        setBgState('done');
      }
      setBgProgress(100);
    } catch (e) {
      console.error('Background removal failed', e);
      setBgState('error');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalFile(file);
    setProcessedFile(null);
    setEmptyProcessedFile(null);
    setManualFile(null);
    setBgState('idle');
    setBgProgress(0);
    setOpaqueRatio(null);
    setError('');
    setSuccess('');
    if (autoBgRemove) {
      runBgRemoval(file);
    }
  };

  const handleToggleAutoBg = (next: boolean) => {
    setAutoBgRemove(next);
    if (
      next &&
      originalFile &&
      !processedFile &&
      bgState !== 'loading-model' &&
      bgState !== 'processing'
    ) {
      runBgRemoval(originalFile);
    }
  };

  const handleRetryBgRemoval = () => {
    if (originalFile) runBgRemoval(originalFile);
  };

  const handleManualCropSave = (cropped: File) => {
    setManualFile(cropped);
    setEmptyProcessedFile(null);
    setOpaqueRatio(null);
    setCropOpen(false);
  };

  // too-empty 결과를 강제로 사용 (사용자가 "그래도 이걸로" 선택)
  const handleUseEmptyAnyway = () => {
    if (!emptyProcessedFile) return;
    setProcessedFile(emptyProcessedFile);
    setEmptyProcessedFile(null);
    setBgState('done');
  };

  // too-empty 일 때 원본 사용으로 전환
  const handleUseOriginal = () => {
    setAutoBgRemove(false);
    setBgState('idle');
  };

  const handleUpload = async () => {
    if (!fileToUpload) return;

    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const response = await imagesAPI.uploadImage(fileToUpload, selectedCategory, tags);
      addImage(response.data);
      setTagsInput('');
      resetAll();
      setSuccess('업로드되었습니다.');
      onImageUploaded?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '업로드에 실패했습니다';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isBgWorking = bgState === 'loading-model' || bgState === 'processing';
  const bgLabel: Record<BgState, string> = {
    idle: '',
    'loading-model': '모델 로딩...',
    processing: '누끼 처리 중...',
    done: '누끼 완료',
    'too-empty': '옷을 찾지 못함',
    error: '누끼 실패 — 원본 사용',
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-neutral-900 tracking-tight">옷 업로드</h3>
        <span className="text-[11px] uppercase tracking-wider text-neutral-400">
          {autoBgRemove ? 'Auto BG' : 'Original'}
        </span>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">카테고리</label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`py-2 text-xs font-medium rounded-lg border transition ${
                  selectedCategory === cat.value
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">태그 (쉼표)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="캐주얼, 여름, 블루"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
          />
        </div>

        <button
          type="button"
          onClick={() => handleToggleAutoBg(!autoBgRemove)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition text-left"
        >
          <div>
            <p className="text-xs font-medium text-neutral-900">누끼 자동 처리</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              브라우저에서 배경 제거 (첫 사용 시 모델 다운로드)
            </p>
          </div>
          <span
            aria-checked={autoBgRemove}
            role="switch"
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition ${
              autoBgRemove
                ? 'bg-neutral-900 border-neutral-900'
                : 'bg-neutral-200 border-neutral-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition translate-y-[1px] ${
                autoBgRemove ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </span>
        </button>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">이미지 파일</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 file:cursor-pointer cursor-pointer"
          />
        </div>

        {previewUrl && (
          <div className="space-y-2">
            <div
              className="relative rounded-lg border border-neutral-200 p-3 flex items-center justify-center min-h-[180px]"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                backgroundColor: '#fafafa',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="미리보기"
                className={`max-h-44 object-contain transition ${
                  isBgWorking ? 'opacity-30' : 'opacity-100'
                }`}
              />

              {isBgWorking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40">
                  <p className="text-xs font-medium text-neutral-800">{bgLabel[bgState]}</p>
                  <div className="w-32 h-1 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-full bg-neutral-900 transition-all"
                      style={{ width: `${bgProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 tabular-nums">{bgProgress}%</p>
                </div>
              )}

              <button
                type="button"
                onClick={resetAll}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 flex items-center justify-center text-xs"
                aria-label="선택 해제"
              >
                ✕
              </button>
            </div>

            {/* manual crop applied — 자동/원본보다 우선하므로 별도 표시 */}
            {manualFile && (
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
                    <path d="M3 8l3 3 7-7" />
                  </svg>
                  직접 누끼 적용됨
                </span>
                <button
                  type="button"
                  onClick={() => setManualFile(null)}
                  className="text-white/70 hover:text-white underline underline-offset-2"
                >
                  되돌리기
                </button>
              </div>
            )}

            {/* too-empty 경고 — 옷이 다 지워진 케이스 (manual crop 적용 전에만) */}
            {bgState === 'too-empty' && !manualFile && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-900 space-y-2">
                <p className="font-medium">
                  배경과 옷의 색이 비슷해 옷을 찾지 못했어요
                  {opaqueRatio != null && (
                    <span className="text-amber-700 font-normal ml-1">
                      ({(opaqueRatio * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
                <p className="text-amber-800/80 leading-relaxed">
                  흰옷을 흰 배경에서 찍은 경우 자주 발생합니다. 다른 배경(어두운 색)에서 다시
                  촬영하시거나, 원본 그대로 올려도 됩니다.
                </p>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCropOpen(true)}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition"
                  >
                    직접 그리기
                  </button>
                  <button
                    type="button"
                    onClick={handleUseOriginal}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 transition"
                  >
                    원본 사용
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryBgRemoval}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-md bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    다시 시도
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleUseEmptyAnyway}
                  className="w-full mt-1 py-1 text-[10px] text-amber-700/80 underline underline-offset-2 hover:text-amber-900"
                >
                  비어있는 결과 그대로 적용
                </button>
              </div>
            )}

            {/* 일반 상태 (manual crop이 안 걸려있을 때만) */}
            {!isBgWorking && bgState !== 'too-empty' && originalFile && !manualFile && (
              <div className="flex items-center justify-between text-[11px] px-1">
                {bgState === 'done' && (
                  <span className="text-emerald-700">
                    ✓ 누끼 처리 완료
                    {opaqueRatio != null && (
                      <span className="text-neutral-400 ml-1">
                        ({(opaqueRatio * 100).toFixed(0)}% 남김)
                      </span>
                    )}
                  </span>
                )}
                {bgState === 'error' && (
                  <span className="text-rose-600">누끼 실패 — 원본으로 업로드됩니다</span>
                )}
                {bgState === 'idle' && !autoBgRemove && (
                  <span className="text-neutral-500">원본 그대로 업로드</span>
                )}
                {bgState === 'idle' && autoBgRemove && (
                  <span className="text-neutral-500">누끼 처리 대기 중</span>
                )}
                {(bgState === 'error' || bgState === 'idle') && autoBgRemove && (
                  <button
                    type="button"
                    onClick={handleRetryBgRemoval}
                    className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
                  >
                    다시 시도
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {originalFile && !isBgWorking && (
          <button
            type="button"
            onClick={() => setCropOpen(true)}
            className="w-full py-2 text-xs font-medium border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50 transition flex items-center justify-center gap-1.5"
          >
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
              <path d="M3 3l5 10 2-4 4-2-11-4z" />
            </svg>
            직접 누끼 따기
          </button>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={
            !fileToUpload ||
            isLoading ||
            isBgWorking ||
            (bgState === 'too-empty' && !manualFile)
          }
          className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading
            ? '업로드 중...'
            : isBgWorking
              ? '누끼 처리 후 업로드 가능'
              : bgState === 'too-empty' && !manualFile
                ? '먼저 위에서 선택해주세요'
                : '업로드'}
        </button>
      </div>

      {cropOpen && originalFile && (
        <ManualCropModal
          file={displayFile ?? originalFile}
          onClose={() => setCropOpen(false)}
          onSave={handleManualCropSave}
        />
      )}
    </div>
  );
}
