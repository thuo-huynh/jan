'use client';

import { useState, type KeyboardEvent } from 'react';

/**
 * Controlled folder + tag editor (T080). Purely presentational/controlled —
 * the parent (NoteEditor) owns the actual `folder`/`tags` state and is
 * responsible for persisting it on save.
 */
export function FolderTagPicker({
  folder,
  tags,
  folderOptions = [],
  onFolderChange,
  onTagsChange,
}: {
  folder: string | null;
  tags: string[];
  folderOptions?: string[];
  onFolderChange: (folder: string | null) => void;
  onTagsChange: (tags: string[]) => void;
}) {
  const [tagDraft, setTagDraft] = useState('');

  function commitTag() {
    const value = tagDraft.trim().replace(/^#/, '');
    setTagDraft('');
    if (!value) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) return;
    onTagsChange([...tags, value]);
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTag();
    } else if (event.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="note-folder" className="label-field">
          Folder
        </label>
        <input
          id="note-folder"
          list="note-folder-options"
          type="text"
          value={folder ?? ''}
          onChange={(e) => onFolderChange(e.target.value.trim() === '' ? null : e.target.value)}
          placeholder="e.g. Grammar, Vocab, General"
          className="input-field"
        />
        <datalist id="note-folder-options">
          {folderOptions.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="note-tags" className="label-field">
          Tags
        </label>
        <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded border border-border bg-background px-2 py-1.5 transition-colors focus-within:border-primary">
          {tags.map((tag) => (
            <span key={tag} className="badge-primary">
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="text-primary/70 hover:text-primary"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id="note-tags"
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={commitTag}
            placeholder={tags.length === 0 ? 'Add tag, press Enter' : ''}
            className="min-w-[6rem] flex-1 bg-transparent text-sm text-foreground focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
