import { useRef } from 'react';

// One tab per customer-site section whose FAQs are managed here (see
// features/faq/definitions/faqs.js's FAQ_SECTIONS). Same segmented look as the
// listing pages' status filter, one size up. Arrow keys move between tabs.
export default function FaqSectionTabs({ sections, activeId, counts = {}, onChange, panelId }) {
  const tabRefs = useRef({});

  const handleKeyDown = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = sections[(index + step + sections.length) % sections.length];
    onChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div role="tablist" aria-label="Website sections" className="inline-flex min-w-max gap-1 rounded-2xl bg-slate-100 p-1.5">
        {sections.map((section, index) => {
          const isActive = section.id === activeId;
          const Icon = section.icon;
          const count = counts[section.id];
          return (
            <button
              key={section.id}
              ref={(node) => {
                tabRefs.current[section.id] = node;
              }}
              type="button"
              role="tab"
              id={`faq-tab-${section.id}`}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
                isActive ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-600' : 'bg-white/70 text-slate-400'
                }`}
                aria-hidden="true"
              >
                <Icon size={15} />
              </span>
              {section.label}
              {typeof count === 'number' && (
                <span
                  className={`min-w-6 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    isActive ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
