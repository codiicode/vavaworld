'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { COUNTRIES, findCountry } from '@/lib/countries';
import { Flag } from '@/components/flag';
import {
  upsertProfile,
  uploadAvatar,
  type ProfileUpdate,
} from '@/lib/supabase-profile';
import { cn } from '@/lib/utils';

type Props = {
  walletAddress: string;
  initialUsername: string | null;
  initialFlagCode: string | null;
  initialAvatarUrl: string | null;
  initialBio: string | null;
  /** Called after a successful save so callers can bump their cache key. */
  onSaved: () => void;
  /** Optional custom trigger (defaults to a small "Edit profile" button). */
  trigger?: React.ReactNode;
};

function gradientFromAddr(addr: string): string {
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

/**
 * Profile edit modal. Username (validated), country flag (searchable picker),
 * avatar upload (preview + Supabase Storage), bio. Save → upsertProfile + close.
 */
export function EditProfileDialog({
  walletAddress,
  initialUsername,
  initialFlagCode,
  initialAvatarUrl,
  initialBio,
  onSaved,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername ?? '');
  const [flagCode, setFlagCode] = useState(initialFlagCode ?? '');
  const [bio, setBio] = useState(initialBio ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Reset form to source-of-truth whenever the dialog is opened.
  useEffect(() => {
    if (!open) return;
    setUsername(initialUsername ?? '');
    setFlagCode(initialFlagCode ?? '');
    setBio(initialBio ?? '');
    setAvatarPreview(initialAvatarUrl);
    setAvatarFile(null);
    setError(null);
  }, [open, initialUsername, initialFlagCode, initialAvatarUrl, initialBio]);

  const usernameError = useMemo(() => {
    if (!username) return null;
    if (username.length < 2) return 'At least 2 characters';
    if (username.length > 24) return 'Max 24 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Letters, numbers, underscore only';
    return null;
  }, [username]);

  const handlePickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2 MB or smaller');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('PNG, JPEG, WebP, or GIF only');
      return;
    }
    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (usernameError) return;
    setSaving(true);
    setError(null);
    try {
      const update: ProfileUpdate = {
        username: username.trim() || null,
        flagCountryCode: flagCode || null,
        bio: bio.trim() || null,
      };
      // Upload avatar first (if changed) and use the resulting public URL.
      if (avatarFile) {
        const url = await uploadAvatar(walletAddress, avatarFile);
        update.avatarUrl = url;
      } else if (avatarPreview !== initialAvatarUrl) {
        // User cleared their custom avatar
        update.avatarUrl = avatarPreview;
      }
      await upsertProfile(walletAddress, update);
      onSaved();
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Edit profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">Edit profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved to your wallet. Visible to everyone.
          </p>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarPreview && <AvatarImage src={avatarPreview} alt="" />}
              <AvatarFallback
                className="text-base font-medium text-white"
                style={{ background: gradientFromAddr(walletAddress) }}
              >
                {walletAddress.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <Upload size={12} />
                Upload
              </Button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Username */}
          <Field label="Username" hint={usernameError ?? '2–24 letters, numbers, or _'}>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="vavaholder"
              maxLength={24}
              className={cn(usernameError && 'border-destructive focus-visible:ring-destructive')}
            />
          </Field>

          {/* Flag picker */}
          <Field label="Country">
            <CountryPicker value={flagCode} onChange={setFlagCode} />
          </Field>

          {/* Bio */}
          <Field label="Bio" hint={`${bio.length} / 280`}>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="Tell people what you collect."
              rows={3}
            />
          </Field>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !!usernameError}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </label>
        {hint && (
          <span className="text-[10.5px] tabular-nums text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function CountryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = findCountry(value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm transition-colors hover:bg-muted/50"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <Flag code={selected.code} size={15} />
              <span>{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">No country</span>
          )}
          <span className="flex items-center gap-1">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear country"
              >
                <X size={12} />
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries…"
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No countries match.
              </p>
            )}
            {filtered.map((c) => {
              const isSelected = c.code === value;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                    isSelected && 'bg-muted',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Flag code={c.code} size={15} />
                    <span>{c.name}</span>
                  </span>
                  {isSelected && <Check size={12} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
