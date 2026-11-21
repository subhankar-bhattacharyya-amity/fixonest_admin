import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth, logoutUser, buildProfileImageUrl } from '@/features/auth/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { ROUTES, getProfilePath } from '@/routes/constants.js';
import LogoutConfirmModal from './LogoutConfirmModal.jsx';

const CLOSE_DELAY_MS = 150;

// The Topbar's role label + avatar. Hovering it (mouse) opens a small menu
// with "My Profile" and "Logout" - same job as fixonest_frontend's
// header UserMenu. Touch screens have no hover, so a tap toggles it instead;
// clicking outside or pressing Escape closes it.
export default function ProfileMenu({ roleLabel }) {
  const { user, role } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const closeTimerRef = useRef(null);
  const pointerTypeRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Hover only for a real mouse - on touch, the synthetic pointerenter that
  // precedes a tap would open the menu and the tap's click would close it.
  const handlePointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(closeTimerRef.current);
    setOpen(true);
  };

  // Short delay so moving the cursor from the avatar down into the menu
  // doesn't close it on the way.
  const handlePointerLeave = (event) => {
    if (event.pointerType !== 'mouse') return;
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  // A mouse user reaching the avatar has already opened the menu by hovering,
  // so their click must not toggle it shut again - only touch/keyboard toggle.
  const handleTriggerClick = () => {
    const isMouse = pointerTypeRef.current === 'mouse';
    pointerTypeRef.current = null;
    setOpen((value) => (isMouse ? true : !value));
  };

  const openLogoutModal = () => {
    setOpen(false);
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      const result = await dispatch(logoutUser()).unwrap();
      toast.success(result.message);
    } catch {
      // Local session is already cleared by authSlice's logoutUser.rejected
      // case regardless - the error itself was already toasted globally by
      // lib/httpClient.js's response interceptor.
    }
    navigate(ROUTES.LOGIN);
  };

  return (
    <>
      <div
        ref={rootRef}
        className="relative"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <button
          type="button"
          onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
          onClick={handleTriggerClick}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-3 cursor-pointer group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{roleLabel}</p>
            <p className="text-xs text-slate-500">Online</p>
          </div>
          <Avatar
            src={buildProfileImageUrl(user)}
            name={user?.fullName}
            className="w-9 h-9 sm:w-10 sm:h-10 text-sm border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-teal-500/30 transition-all"
          />
        </button>

        {open && (
          // pt-2 (not mt-2) keeps the gap under the avatar inside this hover
          // area, so the menu doesn't close while the cursor crosses it.
          <div className="absolute right-0 top-full z-40 pt-2">
            <div
              role="menu"
              className="w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white border border-slate-100 shadow-lg shadow-slate-200/70 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <Link
                  to={getProfilePath(role)}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                >
                  <UserRound size={16} />
                  My Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openLogoutModal}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLogoutModalOpen && (
        <LogoutConfirmModal onCancel={() => setIsLogoutModalOpen(false)} onConfirm={confirmLogout} />
      )}
    </>
  );
}
