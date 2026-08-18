'use client';

import { useEffect } from 'react';
import { PartyPopper } from 'lucide-react';

export interface CelebrationMessage {
  id: string;
  text: string;
}

const CONFETTI_COLORS = ['bg-primary', 'bg-accent', 'bg-success', 'bg-secondary', 'bg-danger'];
const CONFETTI_DOTS = 14;

interface CelebrationBannerProps {
  messages: CelebrationMessage[];
  onDismiss: (id: string) => void;
}

/**
 * Ephemeral celebration for streak milestones and "all habits done today"
 * (HabitGridManager.handleToggleDay). Confetti is a handful of CSS-animated
 * dots rather than a canvas particle library — this can fire fairly often
 * (every milestone, every all-done day) and shouldn't be heavyweight or
 * overstay, so each message auto-dismisses itself after a few seconds.
 */
export function CelebrationBanner({ messages, onDismiss }: CelebrationBannerProps) {
  if (messages.length === 0) return null;

  return (
    <div aria-live="polite" className="space-y-2">
      {messages.map((message) => (
        <CelebrationItem key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function CelebrationItem({
  message,
  onDismiss,
}: {
  message: CelebrationMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(message.id), 3500);
    return () => clearTimeout(timer);
  }, [message.id, onDismiss]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: CONFETTI_DOTS }).map((_, i) => (
          <span
            key={i}
            className={`absolute top-0 h-1.5 w-1.5 rounded-full ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]} animate-confetti-fall`}
            style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i % 5) * 0.08}s` }}
          />
        ))}
      </div>
      <p className="relative flex items-center gap-2 text-sm font-medium text-foreground">
        <PartyPopper className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {message.text}
      </p>
    </div>
  );
}
