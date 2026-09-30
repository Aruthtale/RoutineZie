import type { Metadata, Viewport } from 'next';
import { Anton, Space_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { SafeAreaBootstrap } from '@/components/SafeAreaBootstrap';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: 'RoutineZie — Manga Neubrutalism Routine',
  description: 'Aplikasi Manajemen Rutinitas Harian & Workout Zenn',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full ${anton.variable} ${spaceMono.variable} ${ibmPlexSans.variable}`}>
      <body className="font-sans antialiased h-full">
        <SafeAreaBootstrap />
        {children}
      </body>
    </html>
  );
}
