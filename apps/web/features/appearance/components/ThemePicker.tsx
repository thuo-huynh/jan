'use client';

import type { AppearanceMode, Theme } from '../types';

/**
 * Theme picker (T026) — one swatch per row from the settings page's fetch
 * (US3's admin-added themes show up here automatically, no code change
 * needed). Swatch previews both the primary and accent color for whichever
 * mode is currently active, so the preview matches what selecting it would
 * actually look like.
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
        const accent = mode === 'dark' ? theme.accent_dark : theme.accent_light;
        const selected = theme.id === selectedThemeId;
        return (
          <button
            key={theme.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(theme.id)}
            aria-pressed={selected}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted'
            }`}
          >
            <span className="flex gap-1">
              <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: primary }} />
              <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: accent }} />
            </span>
            <span className="text-sm font-medium text-foreground">{theme.name}</span>
          </button>
        );
      })}
    </div>
  );
}
