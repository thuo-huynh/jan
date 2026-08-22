'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { grammarPointSchema } from '@/shared/validation/schemas';
import type { GrammarPointRecord } from '../lib/mapGrammarPoint';

/**
 * Custom grammar-point form (create + edit) — the grammar equivalent of
 * VocabEntryForm.tsx. `grammar_points.user_id` and its owner-scoped RLS
 * policies (0012_rls_reference_data.sql) already supported this shape ("v1
 * global catalog now, forward-compat for a caller's own rows later"); this
 * is that forward-compat path landing. Reuses `grammarPointSchema`, the same
 * schema the admin reference-data CRUD validates against, so a custom point
 * and an admin-added global point are held to the same shape.
 */
export interface GrammarPointFormValues {
  pattern: string;
  connectionForm: string;
  meaning: string;
  formalityNuance: string;
  exampleSentences: string;
  jlptLevel: string;
  frequencyTag: string;
  n3Overlap: boolean;
}

interface GrammarPointFormProps {
  mode: 'create' | 'edit';
  pointId?: string;
  initialValues?: Partial<GrammarPointFormValues>;
  onSaved: (row: GrammarPointRecord) => void;
  onCancel: () => void;
}

const GRAMMAR_RECORD_COLUMNS =
  'id, user_id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap';

export function GrammarPointForm({ mode, pointId, initialValues, onSaved, onCancel }: GrammarPointFormProps) {
  const [pattern, setPattern] = useState(initialValues?.pattern ?? '');
  const [connectionForm, setConnectionForm] = useState(initialValues?.connectionForm ?? '');
  const [meaning, setMeaning] = useState(initialValues?.meaning ?? '');
  const [formalityNuance, setFormalityNuance] = useState(initialValues?.formalityNuance ?? '');
  const [exampleSentences, setExampleSentences] = useState(initialValues?.exampleSentences ?? '');
  const [jlptLevel, setJlptLevel] = useState(initialValues?.jlptLevel ?? 'N2');
  const [frequencyTag, setFrequencyTag] = useState(initialValues?.frequencyTag ?? '');
  const [n3Overlap, setN3Overlap] = useState(initialValues?.n3Overlap ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = grammarPointSchema.safeParse({
      pattern,
      meaning,
      connectionForm: connectionForm || null,
      formalityNuance: formalityNuance || null,
      exampleSentences: exampleSentences
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      jlptLevel: jlptLevel.trim() || 'N2',
      frequencyTag: frequencyTag || null,
      n3Overlap,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Mục không hợp lệ');
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

    const payload = {
      pattern: parsed.data.pattern,
      meaning: parsed.data.meaning,
      connection_form: parsed.data.connectionForm ?? null,
      formality_nuance: parsed.data.formalityNuance ?? null,
      example_sentences: parsed.data.exampleSentences,
      jlpt_level: parsed.data.jlptLevel,
      frequency_tag: parsed.data.frequencyTag ?? null,
      n3_overlap: parsed.data.n3Overlap,
    };

    const { data, error: dbError } =
      mode === 'create'
        ? await supabase
            .from('grammar_points')
            .insert({ ...payload, user_id: user.id })
            .select(GRAMMAR_RECORD_COLUMNS)
            .single()
        : await supabase
            .from('grammar_points')
            .update(payload)
            .eq('id', pointId!)
            .eq('user_id', user.id)
            .select(GRAMMAR_RECORD_COLUMNS)
            .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Lưu thất bại');
      return;
    }

    onSaved(data as GrammarPointRecord);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-field">Mẫu câu (文型)</label>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            required
            className="input-field font-jp"
          />
        </div>
        <div>
          <label className="label-field">Thể chia (接続)</label>
          <input
            value={connectionForm}
            onChange={(e) => setConnectionForm(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label-field">Nghĩa</label>
          <input value={meaning} onChange={(e) => setMeaning(e.target.value)} required className="input-field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-field">Mức trang trọng / sắc thái</label>
          <input
            value={formalityNuance}
            onChange={(e) => setFormalityNuance(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label-field">Câu ví dụ (mỗi dòng một câu)</label>
          <textarea
            value={exampleSentences}
            onChange={(e) => setExampleSentences(e.target.value)}
            rows={3}
            className="textarea-field font-jp"
          />
        </div>
        <div>
          <label className="label-field">Cấp độ JLPT</label>
          <input value={jlptLevel} onChange={(e) => setJlptLevel(e.target.value)} className="input-field w-28" />
        </div>
        <div>
          <label className="label-field">Tần suất</label>
          <input
            value={frequencyTag}
            onChange={(e) => setFrequencyTag(e.target.value)}
            placeholder="cao / trung bình / thấp"
            className="input-field"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={n3Overlap}
              onChange={(e) => setN3Overlap(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Trùng N3
          </label>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Đang lưu…' : mode === 'create' ? 'Thêm điểm ngữ pháp' : 'Lưu thay đổi'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Hủy
        </button>
      </div>
    </form>
  );
}
