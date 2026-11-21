import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';

// A searchable single-choice picker (combobox): a button showing the current
// choice opens a panel with a search box and the matching options. Keyboard:
// ↑/↓ move, Enter picks, Esc closes. Used for the service and the customer.
//
//   options        - [{ value, label, sublabel?, media?, disabled?, badge? }]
//   selected       - the chosen option object (shown on the button), or null
//   onSearchChange - called with the search text (the parent filters or fetches)
export default function SearchablePicker({
  id,
  selected,
  options,
  onSelect,
  onSearchChange,
  placeholder,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing matches that search',
  loading = false,
  disabled = false,
  invalid = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();

  // Close when clicking anywhere outside the picker.
  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(0);
    // Focus the search box once it's rendered.
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const choose = (option) => {
    if (option.disabled) return;
    onSelect(option);
    setOpen(false);
  };

  const changeQuery = (value) => {
    setQuery(value);
    setActiveIndex(0);
    onSearchChange?.(value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        className={`flex w-full items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-left transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
          invalid
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40'
            : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500/50'
        }`}
      >
        {selected ? (
          <>
            {selected.media}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">{selected.label}</span>
              {selected.sublabel && <span className="block truncate text-xs text-slate-400">{selected.sublabel}</span>}
            </span>
          </>
        ) : (
          <span className="flex-1 py-1 text-sm text-slate-400">{placeholder}</span>
        )}
        {!disabled && <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-dialog-in"
          onKeyDown={handleKeyDown}
        >
          <div className="relative border-b border-slate-100 p-2">
            <Search size={15} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-controls={listId}
              aria-expanded="true"
              aria-activedescendant={options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => changeQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {loading && options.length === 0 ? (
              <li className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Loading…
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-400">{emptyText}</li>
            ) : (
              options.map((option, index) => {
                const isSelected = selected?.value === option.value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${
                      option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${index === activeIndex && !option.disabled ? 'bg-teal-50' : ''}`}
                  >
                    {option.media}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-700">{option.label}</span>
                      {option.sublabel && <span className="block truncate text-xs text-slate-400">{option.sublabel}</span>}
                    </span>
                    {option.badge}
                    {isSelected && <Check size={16} className="shrink-0 text-teal-600" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
