import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../sidebar/index.js';
import { Topbar } from '../topbar/index.js';

// The shell every logged-in page renders inside (see
// routes/config/private.routes.jsx) - Outlet is replaced by the page
// matching the current URL.
//
// One Topbar for the whole panel, so the navbar is identical on every page.
// New pages: register them as children of this layout (via the page's
// *.routes.jsx in private.routes.jsx) and never render a page-level topbar.
// Any fixed-height bar placed in the scrolling column below needs
// `shrink-0` (like Topbar) - otherwise a page taller than the viewport makes
// the browser squeeze it.
// Tailwind's `lg` breakpoint - at and above it the sidebar is always shown
// in-flow (full or collapsed to an icon rail); below it the sidebar is an
// off-canvas drawer.
const DESKTOP_QUERY = '(min-width: 1024px)';
const isDesktopViewport = () => window.matchMedia(DESKTOP_QUERY).matches;

// Per-viewer UI preference only, so plain localStorage is fine - it can throw
// in private/blocked-storage contexts, in which case we just don't persist.
const COLLAPSED_KEY = 'sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(value));
  } catch {
    // Not persisted - the toggle still works for this visit.
  }
}

export default function DashboardLayout() {
  // Mobile/tablet drawer only - on desktop the sidebar is always shown by CSS
  // (lg:translate-x-0) whatever this says. So it always starts closed: if it
  // started "open" on a desktop load, shrinking the window below `lg` later
  // would reveal the drawer + backdrop over the page.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop only: full sidebar vs. icon rail. Ignored below `lg`, where the
  // drawer always shows the full menu.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);

  const closeSidebar = () => setSidebarOpen(false);

  // Auto-close the drawer whenever the viewport crosses the `lg` breakpoint
  // (window resize, DevTools device mode, tablet rotation) so a drawer opened
  // on one layout never lingers over the page on the other. Escape closes it
  // too, like the panel's other overlays.
  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const handleBreakpointChange = () => setSidebarOpen(false);
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    desktopQuery.addEventListener('change', handleBreakpointChange);
    document.addEventListener('keydown', handleEscape);
    return () => {
      desktopQuery.removeEventListener('change', handleBreakpointChange);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const setCollapsed = (value) => {
    setSidebarCollapsed(value);
    writeCollapsed(value);
  };

  // One Topbar button, two jobs: collapse/expand the rail on desktop,
  // open/close the drawer below it.
  const toggleSidebar = () => {
    if (isDesktopViewport()) setCollapsed(!sidebarCollapsed);
    else setSidebarOpen((open) => !open);
  };

  // After picking a menu link on a small screen, get the drawer out of the
  // way so the page is visible - on desktop the sidebar stays put.
  const closeSidebarOnMobile = () => {
    if (!isDesktopViewport()) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={closeSidebar}
        onExpand={() => setCollapsed(false)}
        onNavigate={closeSidebarOnMobile}
      />

      <div className="relative flex flex-col flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

        {/* Full-width content: pages fill the whole area beside the sidebar
            (no centered max-width column), with a consistent responsive gutter. */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
