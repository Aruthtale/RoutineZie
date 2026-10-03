'use client';

/**
 * Error Boundary — menangkap error render/data di seluruh app.
 * Mencegah layar putih total: satu baris rusak → layar pemulihan, bukan blank.
 */

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RoutineZie] Error boundary triggered:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-block bg-white text-ink border-4 border-white px-6 py-4 shadow-[8px_8px_0_0_rgba(255,255,255,0.2)]">
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-anton)' }}>
            Ada yang error
          </h1>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          Aplikasi menemui masalah dan perlu dimuat ulang. Data kamu aman — tersimpan di perangkat.
        </p>
        {error.digest && (
          <p className="text-xs text-white/40 font-mono">Kode: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-white text-ink font-bold px-6 py-3 border-2 border-white hover:bg-white/90 active:translate-x-[2px] active:translate-y-[2px] transition-transform"
        >
          <RotateCcw className="w-4 h-4" />
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
