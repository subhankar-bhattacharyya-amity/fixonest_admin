import { Menu, Search, Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '@/features/auth/index.js';
import { NotificationBell, ProfileMenu } from './components/index.js';

export default function Topbar({ sidebarCollapsed, onToggleSidebar }) {
  const location = useLocation();
  const { role } = useAuth();
  // Every role has a contact inbox - a provider's holds the messages sent to them.
  const hasContactNotifications = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROVIDER].includes(role);
  const roleName = location.pathname.split('/')[2] || 'User';
  
  const formatRole = (role) => {
    return role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // `shrink-0`: the header is a flex child of DashboardLayout's scrolling
  // flex-col column. Without it, any page taller than the viewport makes the
  // browser shrink the header below h-16/h-20 to fit - so the Topbar looked
  // shorter on long pages (e.g. Vertical Admins) than on short ones.
  return (
    <header className="sticky top-0 z-30 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 sm:h-20 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Opens/closes the drawer below `lg`; collapses/expands the sidebar
            rail from `lg` up (see DashboardLayout's toggleSidebar). */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          className="-ml-2 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition-colors"
        >
          <Menu size={24} className="lg:hidden" />
          <span className="hidden lg:block" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
          </span>
        </button>
        
        <div className="hidden md:flex items-center relative">
          <Search size={18} className="absolute left-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search here..." 
            className="pl-10 pr-4 py-2 w-64 bg-slate-100/50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-5">
        {/* Contact notifications are a Super Admin / Admin API - a Provider
            keeps the plain bell until they have notifications of their own. */}
        {hasContactNotifications ? (
          <NotificationBell />
        ) : (
          <button type="button" aria-label="Notifications" className="relative p-2 text-slate-500 hover:text-teal-600 transition-colors rounded-full hover:bg-slate-100">
            <Bell size={20} />
          </button>
        )}

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <ProfileMenu roleLabel={formatRole(roleName)} />
      </div>
    </header>
  );
}
