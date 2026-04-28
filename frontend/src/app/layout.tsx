import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DragFit',
  description: '드래그로 만드는 나만의 코디 — DragFit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased text-neutral-900 bg-neutral-50">{children}</body>
    </html>
  );
}
