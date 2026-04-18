import type { Metadata, Viewport } from 'next';
import { DM_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cinta',
  description: 'Reproductor personal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Cinta',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1014',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${dmMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
