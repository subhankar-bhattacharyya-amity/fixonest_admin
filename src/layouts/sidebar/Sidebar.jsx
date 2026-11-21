import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth, ROLES } from '@/features/auth/index.js';
import { usePendingBookingCount } from '@/features/providerBooking/index.js';
import { useRejectedBookingCount } from '@/features/adminBooking/index.js';
import { usePendingTimeOffCount } from '@/features/providerAvailability/index.js';
import { BrandLogo } from '@/components/common/brandLogo/index.js';
import { getDashboardPath } from '@/routes/constants.js';
import { sidebarMenu } from './sidebar.data.js';
import { resolveMenuForRole } from './sidebar.utils.js';
import { SidebarMenuItem } from './components/index.js';

const isDesktopViewport = () => window.matchMedia('(min-width: 1024px)').matches;

// Below `lg` this is an off-canvas drawer (backdrop + close button, closes
// after a link is picked) that always shows the full menu. From `lg` up it
// sits in-flow and can be collapsed to an icon-only rail (`collapsed`) -
// every collapsed style below is `lg:`-prefixed so the drawer is unaffected.
export default function Sidebar({ isOpen, collapsed, onClose, onExpand, onNavigate }) {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const pendingBookings = usePendingBookingCount();
  const rejectedBookings = useRejectedBookingCount();
  // Super Admin / Admin only - the hook never calls the API for a provider.
  const pendingTimeOff = usePendingTimeOffCount(role);

  // Accordions the user has explicitly opened/closed, keyed by menu id. An id
  // missing here falls back to "open while one of its pages is showing".
  const [openMenus, setOpenMenus] = useState({});

  // Hidden only on the desktop rail, never in the mobile drawer.
  const hideOnRail = collapsed ? 'lg:hidden' : '';
  const centerOnRail = collapsed ? 'lg:justify-center lg:px-0' : '';

  const toggleMenu = (menuId, isOpen) => {
    // A submenu can't open inside the icon rail - expand the sidebar and
    // show that submenu instead.
    if (collapsed && isDesktopViewport()) {
      onExpand();
      setOpenMenus((prev) => ({ ...prev, [menuId]: true }));
      return;
    }
    setOpenMenus((prev) => ({ ...prev, [menuId]: !isOpen }));
  };

  // sidebar.data.js's tree, cut down to what this role may see, with
  // absolute paths under this role's dashboard (see sidebar.utils.js).
  const dashboardPath = getDashboardPath(role);
  const { menuItems, bottomItems } = useMemo(() => {
    const items = resolveMenuForRole(sidebarMenu, role, dashboardPath);
    return {
      menuItems: items.filter((item) => item.placement !== 'bottom'),
      bottomItems: items.filter((item) => item.placement === 'bottom'),
    };
  }, [role, dashboardPath]);

  const menu = {
    pathname,
    basePath: dashboardPath,
    collapsed,
    openMenus,
    onToggle: toggleMenu,
    onNavigate,
    // Count badges by menu id (shown when > 0).
    badges: {
      myBookings: role === ROLES.PROVIDER ? pendingBookings : 0,
      adminBookings: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN ? rejectedBookings : 0,
      // Provider time-off requests waiting for approval.
      providerManagement: pendingTimeOff,
    },
  };

  return (
    <>
      {/* Mobile/tablet backdrop - tap outside the drawer to close it. Sits
          above the sticky Topbar (z-30) and below the drawer (z-40). */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-35 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 max-w-[85vw] shrink-0 overflow-hidden transform transition-[transform,width] duration-300 ease-in-out bg-slate-900 text-slate-300 lg:static lg:max-w-none lg:translate-x-0 flex flex-col shadow-xl ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-center h-20 lg:h-24 border-b border-slate-700/50 bg-slate-950/30">
          <div className={`flex items-center gap-3 px-5 lg:px-6 w-full ${centerOnRail}`}>
            {/* Brand doubles as a "home" link to the logged-in role's own dashboard. */}
            <Link
              to={dashboardPath}
              onClick={onNavigate}
              aria-label="Fixonest - go to dashboard"
              className="flex items-center gap-3 min-w-0 rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <BrandLogo />
              <div className={`flex flex-col min-w-0 ${hideOnRail}`}>
                <span className="text-xl lg:text-2xl font-bold text-white tracking-wide whitespace-nowrap leading-tight">Fixonest</span>
                <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                  {role === ROLES.SUPER_ADMIN ? 'Super Admin' : role === ROLES.PROVIDER ? 'Provider' : 'Admin'}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="ml-auto p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 no-scrollbar">
          <p className={`px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 whitespace-nowrap ${hideOnRail}`}>
            MAIN MENU
          </p>
          {collapsed && <div aria-hidden="true" className="hidden lg:block h-px mx-2 mb-4 bg-slate-700/50" />}
          <ul className="space-y-1.5">
            {menuItems.map((item) => (
              <li key={item.id}>
                <SidebarMenuItem item={item} menu={menu} />
              </li>
            ))}
          </ul>
        </div>

        {/* Footer slot (formerly Logout - that's now in the Topbar's profile menu) */}
        {bottomItems.length > 0 && (
          <ul className="p-4 border-t border-slate-700/50 space-y-1.5">
            {bottomItems.map((item) => (
              <li key={item.id}>
                <SidebarMenuItem item={item} menu={menu} />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
