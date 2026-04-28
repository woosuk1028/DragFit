'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { imagesAPI } from '@/lib/api';
import { useOutfitStore } from '@/lib/store';
import type { ClothingCategory } from '@/types';

interface ImageUploaderProps {
  onImageUploaded?: () => void;
}

const CATEGORIES: { value: ClothingCategory; label: string }[] = [
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'accessories', label: '액세서리' },
];

export default function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory>('top');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const addImage = useOutfitStore((state) => state.addImage);

  const resetFileSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const response = await imagesAPI.uploadImage(selectedFile, selectedCategory, tags);
      addImage(response.data);
      setTagsInput('');
      resetFileSelection();
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

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-neutral-900 tracking-tight">옷 업로드</h3>
        <span className="text-[11px] uppercase tracking-wider text-neutral-400">PNG · 누끼</span>
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
          <div className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="미리보기" className="max-h-44 object-contain" />
            <button
              type="button"
              onClick={resetFileSelection}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 flex items-center justify-center text-xs"
              aria-label="선택 해제"
            >
              ✕
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </div>
  );
}
