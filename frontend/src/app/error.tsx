"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold text-on-surface">Terjadi kesalahan</h2>
      <p className="text-sm text-on-surface-variant max-w-md">
        Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl bg-primary-container text-on-primary-container text-sm font-bold hover:shadow-lg active:scale-95 transition-all"
      >
        Coba lagi
      </button>
    </div>
  );
}
