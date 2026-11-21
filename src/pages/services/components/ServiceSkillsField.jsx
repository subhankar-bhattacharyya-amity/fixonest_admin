import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { SERVICE_LIST_ITEM_MAX, SERVICE_LIST_LIMIT } from '@/features/service/index.js';
import { moveItem } from './moveItem.js';

// Skills as chips: type one and press Enter or a comma, Backspace on an empty
// box takes the last one off, pasting "a, b, c" adds all three, and chips can
// be dragged into a new order. Duplicates (ignoring case) are skipped.
export default function ServiceSkillsField({ id, value, onChange, disabled, error }) {
  const [draft, setDraft] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const isFull = value.length >= SERVICE_LIST_LIMIT;

  const addSkills = (text) => {
    const next = [...value];
    text
      .split(',')
      .map((skill) => skill.trim().slice(0, SERVICE_LIST_ITEM_MAX))
      .filter(Boolean)
      .forEach((skill) => {
        const exists = next.some((existing) => existing.toLowerCase() === skill.toLowerCase());
        if (!exists && next.length < SERVICE_LIST_LIMIT) next.push(skill);
      });
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const removeSkill = (skill) => onChange(value.filter((existing) => existing !== skill));

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-2 transition-all focus-within:ring-2 ${
          error
            ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-500/40'
            : 'border-gray-300 focus-within:border-teal-500 focus-within:ring-teal-500/50'
        }`}
      >
        {value.map((skill, index) => (
          <span
            key={skill}
            draggable={!disabled}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                onChange(moveItem(value, dragIndex, index));
                setDragIndex(index);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`inline-flex max-w-full cursor-grab items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1 text-xs font-medium text-slate-700 ring-1 ring-inset transition-all ${
              dragIndex === index ? 'ring-teal-400 shadow-md' : 'ring-slate-200'
            }`}
          >
            <span className="truncate">{skill}</span>
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              disabled={disabled}
              aria-label={`Remove skill ${skill}`}
              className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <span className="flex min-w-24 flex-1 items-center gap-1.5">
          {value.length === 0 && <Sparkles size={14} className="shrink-0 text-slate-400" />}
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addSkills(draft);
              } else if (event.key === 'Backspace' && !draft && value.length > 0) {
                removeSkill(value[value.length - 1]);
              }
            }}
            onBlur={() => draft.trim() && addSkills(draft)}
            onPaste={(event) => {
              const text = event.clipboardData.getData('text');
              if (text.includes(',')) {
                event.preventDefault();
                addSkills(text);
              }
            }}
            disabled={disabled || isFull}
            maxLength={SERVICE_LIST_ITEM_MAX}
            autoComplete="off"
            placeholder={isFull ? 'Skill limit reached' : value.length === 0 ? 'e.g. Leak detection' : 'Add another'}
            className="w-full min-w-0 bg-transparent py-0.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-400">
          Press Enter or a comma to add · drag to reorder · {value.length}/{SERVICE_LIST_LIMIT}
        </p>
      )}
    </div>
  );
}
