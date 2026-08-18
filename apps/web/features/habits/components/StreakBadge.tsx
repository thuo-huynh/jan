'use client';

import { Crown, Flame } from 'lucide-react';
import { getStreakTier } from '../lib/streak';

const TIER_COLOR: Record<string, string> = {
  spark: 'text-accent',
  on_fire: 'text-warning',
  blazing: 'text-danger',
  legendary: 'text-primary',
};

interface StreakBadgeProps {
  streak: number;
  /**
   * 'onFilled' keeps a fixed light color instead of the tier color — for
   * use on a solid-primary background (TodayChecklist's completed pill)
   * where an escalating hue might not stay legible against every fill.
   */
  variant?: 'default' | 'onFilled';
  className?: string;
}

/**
 * Streak count with an escalating icon/color treatment as it grows (spark
 * -> on fire -> blazing -> legendary), purely cosmetic and derived fresh
 * from the streak number every render — no badge/level persistence.
 * Loosely inspired by stellarhabit.com's per-habit leveling, scaled down to
 * fit a solo tracker with no social/badge backend of its own.
 */
export function StreakBadge({ streak, variant = 'default', className = '' }: StreakBadgeProps) {
  if (streak <= 0) return null;

  const tier = getStreakTier(streak);
  const onFilled = variant === 'onFilled';
  const color = onFilled ? 'text-primary-foreground/85' : (tier ? TIER_COLOR[tier.tier] : 'text-success');
  const Icon = tier?.tier === 'legendary' ? Crown : Flame;

  return (
    <span className={`inline-flex items-center gap-0.5 ${color} ${className}`}>
      <Icon
        className={`h-3 w-3 ${!onFilled && tier?.tier === 'legendary' ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {streak}
    </span>
  );
}
