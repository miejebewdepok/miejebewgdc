"use client";

import { useAppState } from "@/components/providers/app-state-provider";
import SettingsPanel from "./gdc/SettingsPanel";

export function PengaturanView() {
  const { settings, updateSettings } = useAppState();

  return (
    <div className="w-full h-full flex flex-col">
      <SettingsPanel
        settings={settings}
        onUpdateSettings={(newSettings) => updateSettings(newSettings)}
      />
    </div>
  );
}
