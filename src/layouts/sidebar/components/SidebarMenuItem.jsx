import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { isBranchActive, isPathActive } from '../sidebar.utils.js';
import SidebarTooltip from './SidebarTooltip.jsx';

// One sidebar entry - a link, or an accordion that renders its children with
// this same component, so menus can nest to any depth. Top-level entries
// (depth 0) keep the full-size style and the collapsed-rail tooltip; nested
// entries are smaller and hang off a guide line under their parent.
//
// `menu` is shared state from Sidebar.jsx:
//   { pathname, basePath, collapsed, openMenus, onToggle, onNavigate, badges }
// `badges[item.id]` > 0 shows a count pill (a dot on the collapsed rail).
export default function SidebarMenuItem({ item, depth = 0, menu }) {
  const { pathname, basePath, collapsed, openMenus, onToggle, onNavigate, badges } = menu;
  const badge = badges?.[item.id] ?? 0;
  const isTopLevel = depth === 0;
  const Icon = item.icon;

  // Hidden only on the desktop rail, never in the mobile drawer.
  const hideOnRail = collapsed ? 'lg:hidden' : '';
  const centerOnRail = collapsed && isTopLevel ? 'lg:justify-center lg:px-0' : '';

  const rowClass = isTopLevel
    ? `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full ${centerOnRail}`
    : 'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors group w-full';
  const iconSize = isTopLevel ? 20 : 16;

  if (!item.children) {
    const isActive = isPathActive(item.path, pathname, basePath);
    const stateClass = isActive
      ? isTopLevel
        ? 'bg-teal-500/10 text-teal-400 font-medium'
        : 'bg-slate-800/80 text-teal-400 font-medium'
      : isTopLevel
        ? 'hover:bg-slate-800/50 hover:text-white'
        : 'text-slate-400 hover:bg-slate-800/40 hover:text-white';

    return (
      <SidebarTooltip label={item.name} enabled={collapsed && isTopLevel}>
        <NavLink
          to={item.path}
          // `end` so "Dashboard" isn't also marked current on its child pages.
          end={item.path === basePath}
          onClick={onNavigate}
          aria-label={collapsed && isTopLevel ? (badge ? `${item.name}, ${badge} new` : item.name) : undefined}
          className={`${rowClass} ${stateClass} relative`}
        >
          {Icon && (
            <Icon
              size={iconSize}
              className={`shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'}`}
            />
          )}
          <span className={`truncate ${hideOnRail}`}>{item.name}</span>
          {badge > 0 && (
            <>
              <span
                className={`ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold flex items-center justify-center ${hideOnRail}`}
              >
                {badge > 99 ? '99+' : badge}
              </span>
              {collapsed && isTopLevel && (
                <span aria-hidden="true" className="hidden lg:block absolute top-2 right-4 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
              )}
            </>
          )}
        </NavLink>
      </SidebarTooltip>
    );
  }

  const isActive = isBranchActive(item, pathname, basePath);
  // Opens by default while one of its pages is showing; after that the
  // user's own open/close choice wins.
  const isOpen = openMenus[item.id] ?? isActive;
  // A closed accordion shows a dot when a page inside it has a badge, so the
  // count isn't hidden.
  const hasHiddenBadge = !isOpen && sumBadges(item.children, badges) > 0;
  const stateClass = isActive
    ? 'text-teal-400'
    : isTopLevel
      ? 'hover:bg-slate-800/50 hover:text-white'
      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white';

  return (
    <>
      <SidebarTooltip label={item.name} enabled={collapsed && isTopLevel}>
        <button
          type="button"
          onClick={() => onToggle(item.id, isOpen)}
          aria-label={collapsed && isTopLevel ? (hasHiddenBadge ? `${item.name}, has new items` : item.name) : undefined}
          aria-expanded={isOpen}
          className={`${rowClass} justify-between relative ${isActive && isTopLevel ? 'bg-teal-500/5' : ''} ${stateClass}`}
        >
          <span className="flex items-center gap-3 min-w-0">
            {Icon && (
              <Icon
                size={iconSize}
                className={`shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'}`}
              />
            )}
            <span className={`truncate ${hideOnRail}`}>{item.name}</span>
            {hasHiddenBadge && (
              <span aria-hidden="true" className={`w-2 h-2 shrink-0 rounded-full bg-amber-400 ${hideOnRail}`} />
            )}
          </span>
          {hasHiddenBadge && collapsed && isTopLevel && (
            <span aria-hidden="true" className="hidden lg:block absolute top-2 right-4 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          )}
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${hideOnRail}`}
          />
        </button>
      </SidebarTooltip>

      {isOpen && (
        <ul
          className={`mt-1 space-y-1 border-l border-slate-700/50 ${
            isTopLevel ? 'ml-6.5 pl-3' : 'ml-4 pl-2.5'
          } ${hideOnRail}`}
        >
          {item.children.map((child) => (
            <li key={child.id}>
              <SidebarMenuItem item={child} depth={depth + 1} menu={menu} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Total badge count of every page inside an accordion, at any depth.
function sumBadges(children = [], badges = {}) {
  return children.reduce(
    (total, child) => total + (child.children ? sumBadges(child.children, badges) : badges[child.id] ?? 0),
    0,
  );
}
