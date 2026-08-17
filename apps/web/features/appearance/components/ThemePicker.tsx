'use client';

import { Check } from 'lucide-react';
import type { AppearanceMode, Theme } from '../types';

/**
 * Theme picker (T026) — one swatch per row from the settings page's fetch
 * (US3's admin-added themes show up here automatically, no code change
 * needed). Swatch previews primary/secondary/accent for whichever mode is
 * currently active, so the preview matches what selecting it would actually
 * look like. The selected theme gets both a ring/border change AND a check
 * badge — never color alone — so the state reads clearly for users who rely
 * on this page to compare themes precisely (and for anyone with a color
 * vision deficiency).
 */
interface ThemePickerProps {
  themes: Theme[];
  selectedThemeId: string;
  mode: AppearanceMode;
  disabled?: boolean;
  onSelect: (themeId: string) => void;
}

export function ThemePicker({ themes, selectedThemeId, mode, disabled, onSelect }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {themes.map((theme) => {
        const primary = mode === 'dark' ? theme.primary_dark : theme.primary_light;
        const secondary = mode === 'dark' ? theme.secondary_dark : theme.secondary_light;
        const accent = mode === 'dark' ? theme.accent_dark : theme.accent_light;
        const selected = theme.id === selectedThemeId;
        return (
          <button
            key={theme.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(theme.id)}
            aria-pressed={selected}
            className={`relative flex flex-col items-start gap-2.5 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'border-border hover:bg-muted'
            }`}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <span className="flex gap-1">
              <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: primary }} />
              <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: secondary }} />
              <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: accent }} />
            </span>
            <span className="text-sm font-medium text-foreground">{theme.name}</span>
          </button>
        );
      })}
    </div>
  );
}
