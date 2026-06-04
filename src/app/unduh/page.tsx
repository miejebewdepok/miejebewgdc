"use client";

import { useEffect } from "react";

export default function UnduhPage() {
  useEffect(() => {
    window.location.replace(
      "https://github.com/miejebewdepok/miejebewgdc/releases/download/latest/app-release.apk"
    );
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600">Sedang mengalihkan ke APK terbaru...</p>
        <p className="mt-2 text-xs text-gray-500">
          Jika tidak otomatis, klik{" "}
          <a
            href="https://github.com/miejebewdepok/miejebewgdc/releases/download/latest/app-release.apk"
            className="underline"
          >
            tautan ini
          </a>
        </p>
      </div>
    </div>
  );
}
