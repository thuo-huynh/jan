'use client';

export type DailyTaskView = 'today' | 'calendar' | 'board' | 'planner';

const views: { id: DailyTaskView; label: string }[] = [
  { id: 'today', label: 'Hôm nay' }, { id: 'calendar', label: 'Lịch' },
  { id: 'board', label: 'Bảng' }, { id: 'planner', label: 'Planner' },
];

export function DailyTaskViewSwitcher({ value, onChange }: { value: DailyTaskView; onChange: (view: DailyTaskView) => void }) {
  return <div className="mb-5 flex w-fit rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Chế độ xem Daily Tasks">
    {views.map((view) => <button key={view.id} type="button" role="tab" aria-selected={value === view.id} onClick={() => onChange(view.id)} className={value === view.id ? 'btn-primary h-8 px-3 text-xs' : 'btn-ghost h-8 px-3 text-xs'}>{view.label}</button>)}
  </div>;
}
