import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Plus, X } from 'lucide-react';
import { SERVICE_LIST_ITEM_MAX, SERVICE_LIST_LIMIT } from '@/features/service/index.js';
import { moveItem } from './moveItem.js';

// An ordered bullet list ("What you'll get", "Premium package benefits"):
// each line is editable in place, can be dragged or moved up/down, and
// removed. New lines are typed into the box below and added with Enter.
export default function ServiceListField({ id, value, onChange, disabled, placeholder, error, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const isFull = value.length >= SERVICE_LIST_LIMIT;

  const add = (text) => {
    const item = text.trim().slice(0, SERVICE_LIST_ITEM_MAX);
    if (!item || isFull) return;
    if (value.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, item]);
    setDraft('');
  };

  const update = (index, text) => onChange(value.map((item, position) => (position === index ? text : item)));
  // A line emptied while editing is dropped when it loses focus.
  const tidy = (index) => {
    if (!value[index]?.trim()) onChange(value.filter((_, position) => position !== index));
  };
  const remove = (index) => onChange(value.filter((_, position) => position !== index));

  const unusedSuggestions = suggestions.filter(
    (suggestion) => !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div>
      {value.length > 0 && (
        <ol className="mb-2 space-y-1.5">
          {value.map((item, index) => (
            <li
              key={index}
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
              className={`group flex items-center gap-2 rounded-xl border bg-white px-2 py-1.5 transition-all ${
                dragIndex === index ? 'border-teal-300 shadow-md ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <GripVertical size={15} className="shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400" aria-hidden="true" />
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" aria-hidden="true" />
              <input
                type="text"
                value={item}
                maxLength={SERVICE_LIST_ITEM_MAX}
                disabled={disabled}
                onChange={(event) => update(index, event.target.value)}
                onBlur={() => tidy(index)}
                aria-label={`Item ${index + 1}`}
                className="min-w-0 flex-1 bg-transparent py-1 text-sm text-slate-700 outline-none"
              />
              <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                <SmallButton label="Move up" disabled={disabled || index === 0} onClick={() => onChange(moveItem(value, index, index - 1))}>
                  <ArrowUp size={14} />
                </SmallButton>
                <SmallButton
                  label="Move down"
                  disabled={disabled || index === value.length - 1}
                  onClick={() => onChange(moveItem(value, index, index + 1))}
                >
                  <ArrowDown size={14} />
                </SmallButton>
                <SmallButton label="Remove" tone="rose" disabled={disabled} onClick={() => remove(index)}>
                  <X size={14} />
                </SmallButton>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={SERVICE_LIST_ITEM_MAX}
          disabled={disabled || isFull}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder={isFull ? 'List is full' : placeholder}
          className={`input-field bg-slate-50 text-sm ${error ? 'border-rose-300' : ''}`}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={disabled || isFull || !draft.trim()}
          aria-label="Add item"
          className="shrink-0 rounded-lg bg-teal-50 px-3 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
        </button>
      </div>

      {unusedSuggestions.length > 0 && !isFull && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Quick add:</span>
          {unusedSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => add(suggestion)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-colors"
            >
              <Plus size={11} />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-400">
          Press Enter to add · drag to reorder · {value.length}/{SERVICE_LIST_LIMIT}
        </p>
      )}
    </div>
  );
}

function SmallButton({ label, tone = 'slate', disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md p-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        tone === 'rose' ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
