import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '🀄 麻將聽牌計算機',
  description: '麻將聽牌計算機 - 計算向聽數、聽牌、番數',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}