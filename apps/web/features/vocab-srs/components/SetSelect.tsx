'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { vocabSetSchema } from '@/shared/validation/schemas';
import type { VocabSet } from '../types';

interface SetSelectProps {
  sets: VocabSet[];
  value: string | null;
  onChange: (setId: string) => void;
  onSetCreated: (set: VocabSet) => void;
}

const CREATE_NEW_VALUE = '__create_new__';

/**
 * "Choose a set, or create one on the spot" control shared by VocabEntryForm
 * and BulkVocabAddForm — the Quizlet-style flow is to name the set right
 * when you're about to add words to it, not as a separate empty-set-creation
 * step first. Selecting "+ Tạo set mới…" swaps the dropdown for a name input;
 * confirming inserts the set and immediately selects it via `onChange`, so
 * the surrounding form's submit just works with whatever `value` ends up
 * being — it never needs to know a set was just created vs already existed.
 */
export function SetSelect({ sets, value, onChange, onSetCreated }: SetSelectProps) {
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
      .from('vocab_sets')
      .insert({ user_id: user.id, name: parsed.data.name })
      .select('id, name, created_at')
      .single();

    setSubmitting(false);
    if (dbError || !data) {
      setError(dbError?.message ?? 'Không thể tạo set');
      return;
    }

    onSetCreated(data as VocabSet);
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
            placeholder="vd: Bài 12 - Động từ"
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
