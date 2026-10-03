'use client';

/**
 * Global Error — menangkap error fatal yang bahkan error.tsx tidak bisa handle
 * (misal: error di root layout itself).
 */

import { RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-ink text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="inline-block bg-white text-ink border-4 border-white px-6 py-4">
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Aplikasi error
            </h1>
          </div>
          <p className="text-sm text-white/70">
            Tutup dan buka kembali aplikasi. Data kamu aman.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-white text-ink font-bold px-6 py-3 border-2 border-white"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
