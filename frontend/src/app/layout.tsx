import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'DragFit',
  description: '드래그로 만드는 나만의 코디 — DragFit',
  applicationName: 'DragFit',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DragFit',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased text-neutral-900 bg-neutral-50">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
