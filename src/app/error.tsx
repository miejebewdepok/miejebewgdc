"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
            <svg
              aria-hidden="true"
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Terjadi Kesalahan</h1>
            <p className="text-xs text-slate-400">
              {error?.message ?? "Aplikasi mengalami masalah tak terduga."}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          Jangan khawatir, data kasir yang tersimpan di perangkat tetap aman.
          Coba muat ulang antarmuka untuk melanjutkan.
        </p>

        <button
          onClick={() => {
            try {
              reset();
            } catch (e) {
              window.location.reload();
            }
          }}
          className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 active:bg-red-700 transition-colors"
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}
