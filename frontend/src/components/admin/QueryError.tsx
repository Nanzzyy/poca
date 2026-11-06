"use client";

export function QueryError({ onRetry, retrying = false }: { onRetry: () => void; retrying?: boolean }) {
  return <div role="alert" className="py-12 px-4 text-center text-on-surface-variant">
    <p>Gagal memuat data. Silakan coba lagi.</p>
    <button type="button" onClick={onRetry} disabled={retrying}
      className="mt-4 rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      {retrying ? "Memuat..." : "Coba lagi"}
    </button>
  </div>;
}
