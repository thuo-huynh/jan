'use client';

import { useState } from 'react';
import { ModeToggle } from './ModeToggle';
import { ThemePicker } from './ThemePicker';
import type { AppearanceMode, Theme } from '../types';

/**
 * Wires ModeToggle + ThemePicker to POST /api/appearance with an optimistic
 * UI update (T027). The settings page already fetches every `themes` row
 * for the picker's swatches, so on a change this applies that theme's CSS
 * variables directly via inline styles on `<html>` — the server-rendered
 * `[data-theme]` stylesheet (app/layout.tsx) only covers the theme active
 * at the last full page load, so an inline-style override is what makes the
 * switch visible immediately instead of only after the next reload.
 */
interface AppearanceSettingsManagerProps {
  initialMode: AppearanceMode;
  initialThemeId: string;
  themes: Theme[];
}

function applyThemeVars(theme: Theme, mode: AppearanceMode) {
  const root = document.documentElement;
  const vars: Record<string, string> =
    mode === 'dark'
      ? {
          '--primary': theme.primary_dark,
          '--primary-foreground': theme.primary_foreground_dark,
          '--secondary': theme.secondary_dark,
          '--secondary-foreground': theme.secondary_foreground_dark,
          '--accent': theme.accent_dark,
          '--accent-foreground': theme.accent_foreground_dark,
        }
      : {
          '--primary': theme.primary_light,
          '--primary-foreground': theme.primary_foreground_light,
          '--secondary': theme.secondary_light,
          '--secondary-foreground': theme.secondary_foreground_light,
          '--accent': theme.accent_light,
          '--accent-foreground': theme.accent_foreground_light,
        };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.classList.toggle('dark', mode === 'dark');
  root.dataset.theme = theme.slug;
}

export function AppearanceSettingsManager({
  initialMode,
  initialThemeId,
  themes,
}: AppearanceSettingsManagerProps) {
  const [mode, setMode] = useState<AppearanceMode>(initialMode);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentTheme = themes.find((t) => t.id === themeId) ?? themes[0];

  async function persist(body: { mode?: AppearanceMode; themeId?: string }): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error('Failed to save appearance preference');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appearance preference');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModeChange(nextMode: AppearanceMode) {
    const previousMode = mode;
    setMode(nextMode);
    if (currentTheme) applyThemeVars(currentTheme, nextMode);
    const ok = await persist({ mode: nextMode });
    if (!ok) {
      setMode(previousMode);
      if (currentTheme) applyThemeVars(currentTheme, previousMode);
    }
  }

  async function handleThemeSelect(nextThemeId: string) {
    const nextTheme = themes.find((t) => t.id === nextThemeId);
    if (!nextTheme) return;
    const previousThemeId = themeId;
    setThemeId(nextThemeId);
    applyThemeVars(nextTheme, mode);
    const ok = await persist({ themeId: nextThemeId });
    if (!ok) {
      setThemeId(previousThemeId);
      if (currentTheme) applyThemeVars(currentTheme, mode);
    }
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Mode</h2>
        <ModeToggle mode={mode} disabled={submitting} onChange={handleModeChange} />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Color theme</h2>
        <ThemePicker
          themes={themes}
          selectedThemeId={themeId}
          mode={mode}
          disabled={submitting}
          onSelect={handleThemeSelect}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
