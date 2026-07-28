'use client';

import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Account
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Preferences and notifications
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/40 bg-white/30 px-6 py-20 text-center backdrop-blur-md">
        <SettingsIcon className="text-foreground/40" size={28} strokeWidth={1.6} />
        <p className="text-sm font-medium text-foreground">Settings coming soon</p>
        <p className="max-w-sm text-xs text-foreground/55">
          Notification preferences, RPC choice, and display options will live here.
        </p>
      </div>
    </div>
  );
}
