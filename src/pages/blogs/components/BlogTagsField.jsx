import { useState } from 'react';
import { Hash, X } from 'lucide-react';
import { BLOG_TAG_MAX, BLOG_TAGS_LIMIT } from '@/features/blog/index.js';

// Tags as chips: type one and press Enter or a comma to add it, Backspace on
// an empty box to take the last one off. Pasting "a, b, c" adds all three.
// Duplicates (ignoring case) are skipped.
export default function BlogTagsField({ id, value, onChange, disabled, error }) {
  const [draft, setDraft] = useState('');
  const isFull = value.length >= BLOG_TAGS_LIMIT;

  const addTags = (text) => {
    const next = [...value];
    text
      .split(',')
      .map((tag) => tag.trim().slice(0, BLOG_TAG_MAX))
      .filter(Boolean)
      .forEach((tag) => {
        const exists = next.some((existing) => existing.toLowerCase() === tag.toLowerCase());
        if (!exists && next.length < BLOG_TAGS_LIMIT) next.push(tag);
      });
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const removeTag = (tag) => onChange(value.filter((existing) => existing !== tag));

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTags(draft);
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-2 transition-all focus-within:ring-2 ${
          error
            ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-500/40'
            : 'border-gray-300 focus-within:border-teal-500 focus-within:ring-teal-500/50'
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
              className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <span className="flex min-w-24 flex-1 items-center gap-1.5">
          {value.length === 0 && <Hash size={14} className="shrink-0 text-slate-400" />}
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => draft.trim() && addTags(draft)}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text');
              if (text.includes(',')) {
                event.preventDefault();
                addTags(text);
              }
            }}
            disabled={disabled || isFull}
            maxLength={BLOG_TAG_MAX}
            autoComplete="off"
            placeholder={isFull ? 'Tag limit reached' : value.length === 0 ? 'e.g. Maintenance' : 'Add another'}
            className="w-full min-w-0 bg-transparent py-0.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">
          Press Enter or a comma to add. {value.length}/{BLOG_TAGS_LIMIT} tags.
        </p>
      )}
    </div>
  );
}
