'use client';

/**
 * Account settings. Preferences persist to localStorage under the keys
 * in lib/preferences.ts and are read by the surfaces they affect (the
 * map reads map style + view on open). Theme is applied live via
 * useTheme.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Globe2, Map as MapIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { PREF_KEYS } from '@/lib/preferences';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md';

/** Tiny persisted preference hook (localStorage, SSR-safe). */
function usePref<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(stored as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [mapStyle, setMapStyle] = usePref<'satellite' | 'standard'>(PREF_KEYS.mapStyle, 'satellite');
  const [mapView, setMapView] = usePref<'2d' | '3d'>(PREF_KEYS.mapView, '2d');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Account
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1.5 text-sm text-foreground/70">
          Preferences are saved to this device.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Appearance */}
        <Section icon={<Sun size={15} />} title="Appearance">
          <Row label="Theme" hint="Light or dark across the app.">
            <Segmented
              value={theme}
              onChange={(v) => {
                if (v !== theme) toggle();
              }}
              options={[
                { value: 'light', label: 'Light', icon: <Sun size={14} /> },
                { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
              ]}
            />
          </Row>
        </Section>

        {/* Map */}
        <Section icon={<MapIcon size={15} />} title="Map">
          <Row label="Default style" hint="What the map opens with.">
            <Segmented
              value={mapStyle}
              onChange={setMapStyle}
              options={[
                { value: 'satellite', label: 'Satellite', icon: <Globe2 size={14} /> },
                { value: 'standard', label: 'Standard', icon: <MapIcon size={14} /> },
              ]}
            />
          </Row>
          <Row label="Default view" hint="2D flat, or 3D tilted.">
            <Segmented
              value={mapView}
              onChange={setMapView}
              options={[
                { value: '2d', label: '2D' },
                { value: '3d', label: '3D' },
              ]}
            />
          </Row>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell size={15} />} title="Notifications">
          <div className="rounded-xl border border-white/40 bg-white/20 px-4 py-4">
            <p className="text-sm font-medium text-foreground">In-app notifications are live</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-foreground/60">
              Offers on your land, accepted bids, and sales land in{' '}
              <Link href="/notifications" className="font-medium text-foreground underline-offset-2 hover:underline">
                your notifications
              </Link>
              . Email and push alerts - coups, throne challenges, claims near
              your land - come with launch.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Offer received', 'Offer accepted', 'Hex sold', 'Outbid'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/40 bg-white/30 px-2.5 py-1 text-[11px] font-medium text-foreground/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD} p-5 md:p-6`}>
      <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        {icon}
        {title}
      </div>
      <div className="flex flex-col divide-y divide-white/30">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-foreground/55">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/40 bg-white/20 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === o.value
              ? 'bg-white/70 text-foreground shadow-sm dark:bg-white/15'
              : 'text-foreground/55 hover:text-foreground',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
