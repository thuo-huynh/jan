import type { LucideIcon } from 'lucide-react';

export function LearningHero({
  icon: Icon,
  title,
  description,
  tone = 'blue',
  meta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'blue' | 'violet' | 'mint' | 'rose';
  meta: string;
}) {
  return (
    <section className={`learning-hero learning-hero-${tone}`}>
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card/80 shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">Không gian học riêng</p>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 opacity-80 sm:text-base">{description}</p>
      </div>
      <div className="relative z-10 mt-5 inline-flex rounded-xl bg-card/75 px-3 py-2 text-xs font-semibold shadow-sm">
        {meta}
      </div>
      <div className="absolute bottom-3 right-5 text-5xl drop-shadow-sm" aria-hidden="true">🦊</div>
    </section>
  );
}
