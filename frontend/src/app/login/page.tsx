'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await authAPI.login(email, password);
      setAuth(response.data);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '로그인에 실패했습니다';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-neutral-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Left brand panel */}
      <div className="hidden lg:flex bg-neutral-950 text-white p-12 flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">DragFit</p>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            드래그로 만드는<br />나만의 코디.
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-sm">
            상의 · 하의 · 신발을 자유롭게 배치하고, 매일의 룩을 저장해 다시 꺼내보세요.
          </p>
        </div>
        <p className="text-xs text-neutral-500">© DragFit</p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-2">DragFit</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">로그인</h2>
            <p className="mt-1 text-sm text-neutral-500">계정으로 들어가기</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>

            <p className="text-center text-sm text-neutral-500 pt-2">
              계정이 없으신가요?{' '}
              <Link
                href="/signup"
                className="text-neutral-900 font-medium underline underline-offset-2 hover:text-neutral-700"
              >
                회원가입
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
