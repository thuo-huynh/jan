'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { attachTermToSrsSchema } from '@/shared/validation/schemas';

/**
 * Attach a passage vocab-term annotation straight to SRS (US4) — unlike
 * AttachToSrsButton.tsx (blank form, attached from a reading-log entry), the
 * word/reading/meaning here are already known from the term segment itself,
 * so this is a single confirm action, not a form.
 */
interface AttachTermToSrsButtonProps {
  term: string;
  reading: string;
  meaning: string;
  readingPassageId: string;
}

export function AttachTermToSrsButton({ term, reading, meaning, readingPassageId }: AttachTermToSrsButtonProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleAttach() {
    setError(null);
    const parsed = attachTermToSrsSchema.safeParse({
      word: term,
      reading: reading || null,
      meaning,
      sourceReadingPassageId: readingPassageId,
    });
    if (!parsed.success) {
      setStatus('error');
      setError(parsed.error.issues[0]?.message ?? 'Mục không hợp lệ');
      return;
    }

    setStatus('saving');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus('error');
      setError('Bạn cần đăng nhập.');
      return;
    }

    const { error: dbError } = await supabase.from('vocab_entries').insert({
      user_id: user.id,
      word: parsed.data.word,
      reading: parsed.data.reading ?? null,
      meaning: parsed.data.meaning,
      source_reading_passage_id: parsed.data.sourceReadingPassageId,
    });

    if (dbError) {
      setStatus('error');
      setError(dbError.message);
      return;
    }
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="h-3 w-3" aria-hidden="true" />
        Đã thêm vào lịch ôn
      </span>
    );
  }

  return (
    <span className="block">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAttach}
        disabled={status === 'saving'}
        className="btn-outline h-7 px-2 text-xs"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        {status === 'saving' ? 'Đang thêm…' : 'Thêm vào lịch ôn'}
      </button>
      {error && <span className="error-text mt-1 block">{error}</span>}
    </span>
  );
}
