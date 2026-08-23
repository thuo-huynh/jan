'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { readingPassageSetSchema } from '@/shared/validation/schemas';
import type { ReadingPassageSet } from '../types';

interface ReadingPassageSetSelectProps {
  sets: ReadingPassageSet[];
  value: string | null;
  onChange: (setId: string | null) => void;
  onSetCreated: (set: ReadingPassageSet) => void;
}

const CREATE_NEW_VALUE = '__create_new__';
const NONE_VALUE = '';

/**
 * "Choose a set, or create one on the spot, or leave ungrouped" control for
 * reading_passage_sets — mirrors GrammarSetSelect.tsx, except set assignment
 * is optional here (FR-006), so unlike Grammar's required `<select>` this one
 * always offers a "no set" option.
 */
export function ReadingPassageSetSelect({ sets, value, onChange, onSetCreated }: ReadingPassageSetSelectProps) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = readingPassageSetSchema.safeParse({ name: draftName });
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
      .from('reading_passage_sets')
      .insert({ user_id: user.id, name: parsed.data.name })
      .select('id, name, created_at')
      .single();

    setSubmitting(false);
    if (dbError || !data) {
      setError(dbError?.message ?? 'Không thể tạo set');
      return;
    }

    onSetCreated(data as ReadingPassageSet);
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
            placeholder="vd: Đọc hiểu N3"
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
      <label className="label-field">Set (không bắt buộc)</label>
      <select
        value={value ?? NONE_VALUE}
        onChange={(e) => {
          if (e.target.value === CREATE_NEW_VALUE) {
            setCreating(true);
            return;
          }
          onChange(e.target.value || null);
        }}
        className="input-field"
      >
        <option value={NONE_VALUE}>Không gán set</option>
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
