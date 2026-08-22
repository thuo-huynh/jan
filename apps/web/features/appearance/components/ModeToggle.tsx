'use client';

import { Moon, Sun } from 'lucide-react';
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
  const options: { value: AppearanceMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Sáng', icon: Sun },
    { value: 'dark', label: 'Tối', icon: Moon },
  ];

  return (
    <div className="inline-flex gap-1 rounded border border-border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={mode === option.value}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            mode === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <option.icon className="h-4 w-4" aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
