import { useState } from 'react';
import { createPortal } from 'react-dom';

// Label shown beside an icon while the desktop sidebar is collapsed to its
// icon rail. Rendered into document.body with `position: fixed` (not as an
// absolutely-positioned child) because the sidebar's scrolling menu list
// clips anything that sticks out past its edge.
export default function SidebarTooltip({ label, enabled, children }) {
  const [position, setPosition] = useState(null);

  const show = (event) => {
    // The rail only exists from `lg` up - below it the drawer shows full labels.
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({ top: rect.top + rect.height / 2, left: rect.right + 12 });
  };
  const hide = () => setPosition(null);

  return (
    <div
      onPointerEnter={(event) => event.pointerType === 'mouse' && show(event)}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {enabled &&
        position &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          >
            {label}
          </div>,
          document.body,
        )}
    </div>
  );
}
