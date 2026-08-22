'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { vocabSetSchema } from '@/shared/validation/schemas';
import type { GrammarSet } from '../types';

interface GrammarSetSelectProps {
  sets: GrammarSet[];
  value: string | null;
  onChange: (setId: string) => void;
  onSetCreated: (set: GrammarSet) => void;
}

const CREATE_NEW_VALUE = '__create_new__';

/**
 * "Choose a set, or create one on the spot" control for grammar_sets —
 * grammar's counterpart to features/vocab-srs/components/SetSelect.tsx
 * (same shape, separate table; kept as its own small component rather than
 * a shared generic one since grammar and vocab never cross-import
 * components elsewhere in this codebase). Reuses `vocabSetSchema` for
 * validation since a set is just `{ name }` in both tables — no need for a
 * second identical schema.
 */
export function GrammarSetSelect({ sets, value, onChange, onSetCreated }: GrammarSetSelectProps) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = vocabSetSchema.safeParse({ name: draftName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Tên set không hợp lệ');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('Bạn cần đăng nhập.');
      return;
    }

    const { data, error: dbError } = await supabase
      .from('grammar_sets')
      .insert({ user_id: user.id, name: parsed.data.name })
      .select('id, name, created_at')
      .single();

    setSubmitting(false);
    if (dbError || !data) {
      setError(dbError?.message ?? 'Không thể tạo set');
      return;
    }

    onSetCreated(data as GrammarSet);
    onChange(data.id);
    setCreating(false);
    setDraftName('');
  }

  if (creating) {
    return (
      <div>
        <label className="label-field">Tên set mới</label>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="vd: Ngữ pháp IT/BrSE"
            className="input-field"
          />
          <button type="submit" disabled={submitting} className="btn-primary shrink-0 px-3">
            {submitting ? 'Đang tạo…' : 'Tạo'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setDraftName('');
              setError(null);
            }}
            className="btn-outline shrink-0 px-3"
          >
            Hủy
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="label-field">Set</label>
      <select
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value === CREATE_NEW_VALUE) {
            setCreating(true);
            return;
          }
          onChange(e.target.value);
        }}
        required
        className="input-field"
      >
        <option value="" disabled>
          Chọn set…
        </option>
        {sets.map((set) => (
          <option key={set.id} value={set.id}>
            {set.name}
          </option>
        ))}
        <option value={CREATE_NEW_VALUE}>+ Tạo set mới…</option>
      </select>
    </div>
  );
}
