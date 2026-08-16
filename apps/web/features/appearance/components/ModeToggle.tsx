'use client';

import type { AppearanceMode } from '../types';

/**
 * Light/dark mode toggle (T025). Purely controlled — the parent
 * (AppearanceSettingsManager) owns the optimistic state + the
 * POST /api/appearance call.
 */
interface ModeToggleProps {
  mode: AppearanceMode;
  disabled?: boolean;
  onChange: (mode: AppearanceMode) => void;
}

export function ModeToggle({ mode, disabled, onChange }: ModeToggleProps) {
  const options: { value: AppearanceMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <div className="inline-flex gap-1 rounded-md border border-border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={mode === option.value}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
