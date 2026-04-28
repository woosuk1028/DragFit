'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await authAPI.signup(email, password, name);
      setAuth(response.data);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '회원가입에 실패했습니다';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-neutral-50">
      <div className="hidden lg:flex bg-neutral-950 text-white p-12 flex-col justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">DragFit</p>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            오늘의 룩을<br />쌓아가는 곳.
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-sm">
            가입하고 첫 코디를 만들어보세요. 옷 사진을 올리고 자유롭게 배치하면 됩니다.
          </p>
        </div>
        <p className="text-xs text-neutral-500">© DragFit</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-2">DragFit</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">회원가입</h2>
            <p className="mt-1 text-sm text-neutral-500">계정 만들기</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>
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
                placeholder="6자 이상"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {isLoading ? '가입 중...' : '회원가입'}
            </button>

            <p className="text-center text-sm text-neutral-500 pt-2">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-neutral-900 font-medium underline underline-offset-2 hover:text-neutral-700"
              >
                로그인
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
