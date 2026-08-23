'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { readingPassageSchema } from '@/shared/validation/schemas';
import { parseInlinePassageSyntax } from '../lib/parseInlinePassageSyntax';
import { mapReadingPassage, type ReadingPassageQuestionRecord, type ReadingPassageRecord } from '../lib/mapReadingPassage';
import { ReadingPassageSetSelect } from './ReadingPassageSetSelect';
import type { ReadingPassage, ReadingPassageSet } from '../types';

interface DraftQuestion {
  questionText: string;
  choices: [string, string, string, string];
  correctChoiceIndex: number;
  explanation: string;
}

function blankQuestion(): DraftQuestion {
  return { questionText: '', choices: ['', '', '', ''], correctChoiceIndex: 0, explanation: '' };
}

interface ReadingPassageFormProps {
  sets: ReadingPassageSet[];
  onSetCreated: (set: ReadingPassageSet) => void;
  onSaved: (passage: ReadingPassage) => void;
  onCancel: () => void;
}

/**
 * Manual passage-creation form (US3) — the passage-bank equivalent of
 * GrammarPointForm.tsx, but create-only (editing is out of scope per
 * spec.md's Assumptions) and with a dynamic list of questions instead of a
 * flat field set, since a passage can have more than one.
 */
export function ReadingPassageForm({ sets, onSetCreated, onSaved, onCancel }: ReadingPassageFormProps) {
  const [title, setTitle] = useState('');
  const [passageBody, setPassageBody] = useState('');
  const [translationVn, setTranslationVn] = useState('');
  const [tip, setTip] = useState('');
  const [setId, setSetId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateChoice(qIndex: number, cIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const choices = [...q.choices] as [string, string, string, string];
        choices[cIndex] = value;
        return { ...q, choices };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = readingPassageSchema.safeParse({
      title,
      segments: parseInlinePassageSyntax(passageBody),
      translationVn: translationVn || null,
      tip: tip || null,
      setId,
      questions,
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

    const { data: passageRow, error: passageError } = await supabase
      .from('reading_passages')
      .insert({
        user_id: user.id,
        set_id: parsed.data.setId ?? null,
        title: parsed.data.title,
        passage_segments: parsed.data.segments,
        translation_vn: parsed.data.translationVn ?? null,
        tip: parsed.data.tip ?? null,
      })
      .select('id, set_id, title, passage_segments, translation_vn, tip')
      .single();

    if (passageError || !passageRow) {
      setSubmitting(false);
      setError(passageError?.message ?? 'Lưu thất bại');
      return;
    }

    const { data: questionRows, error: questionError } = await supabase
      .from('reading_passage_questions')
      .insert(
        parsed.data.questions.map((q, i) => ({
          passage_id: passageRow.id,
          order_index: i,
          question_text: q.questionText,
          choices: q.choices,
          correct_choice_index: q.correctChoiceIndex,
          explanation: q.explanation,
        })),
      )
      .select('id, passage_id, order_index, question_text, choices, correct_choice_index, explanation');

    setSubmitting(false);
    if (questionError || !questionRows) {
      setError(questionError?.message ?? 'Lưu câu hỏi thất bại');
      return;
    }

    onSaved(mapReadingPassage(passageRow as ReadingPassageRecord, questionRows as ReadingPassageQuestionRecord[]));
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4">
      <ReadingPassageSetSelect sets={sets} value={setId} onChange={setSetId} onSetCreated={onSetCreated} />

      <div>
        <label className="label-field">Tiêu đề</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
      </div>

      <div>
        <label className="label-field">Đoạn văn</label>
        <textarea
          value={passageBody}
          onChange={(e) => setPassageBody(e.target.value)}
          rows={6}
          placeholder="Dán đoạn văn vào đây. Đánh dấu từ khó bằng cú pháp {từ|cách đọc|nghĩa}, vd: {規則|きそく|quy tắc}"
          className="textarea-field font-jp"
        />
        <p className="helper-text">Cú pháp {'{từ|cách đọc|nghĩa}'} sẽ hiển thị thành từ có thể bấm vào để xem nghĩa và đính vào SRS.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-field">Bản dịch (không bắt buộc)</label>
          <textarea value={translationVn} onChange={(e) => setTranslationVn(e.target.value)} rows={3} className="textarea-field" />
        </div>
        <div>
          <label className="label-field">Mẹo làm bài (không bắt buộc)</label>
          <textarea value={tip} onChange={(e) => setTip(e.target.value)} rows={3} className="textarea-field" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="label-field">Câu hỏi</p>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <input
                value={q.questionText}
                onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                placeholder={`Câu hỏi ${qIndex + 1}`}
                required
                className="input-field flex-1"
              />
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  aria-label={`Xóa câu hỏi ${qIndex + 1}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {q.choices.map((choice, cIndex) => (
                <div key={cIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctChoiceIndex === cIndex}
                    onChange={() => updateQuestion(qIndex, { correctChoiceIndex: cIndex })}
                    aria-label={`Đáp án đúng là lựa chọn ${cIndex + 1}`}
                    className="h-4 w-4 shrink-0 border-border text-primary focus:ring-primary"
                  />
                  <input
                    value={choice}
                    onChange={(e) => updateChoice(qIndex, cIndex, e.target.value)}
                    placeholder={`Đáp án ${cIndex + 1}`}
                    required
                    className="input-field flex-1"
                  />
                </div>
              ))}
            </div>
            <textarea
              value={q.explanation}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
              placeholder="Giải thích đáp án"
              rows={2}
              required
              className="textarea-field"
            />
          </div>
        ))}
        <button type="button" onClick={addQuestion} className="btn-outline h-9 px-3 text-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm câu hỏi
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Đang lưu…' : 'Lưu bài đọc'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Hủy
        </button>
      </div>
    </form>
  );
}
