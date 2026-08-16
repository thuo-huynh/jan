import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jp',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'TaskNihongo',
  description: 'Kanban task management + JLPT N2 Japanese study tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${notoSansJP.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
