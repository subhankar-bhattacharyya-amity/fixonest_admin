import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth, fetchProfile, ROLES } from '@/features/auth/index.js';
import { fetchMyProviderDetails } from '@/features/providerProfile/index.js';
import { ProfileHero, PersonalInfoCard, ChangePasswordCard, ProviderDetailsCard } from './components/index.js';

// "My Profile" for every role (Super Admin, Admin, Provider) - opened from the
// Topbar's profile menu. Same sections as fixonest_frontend's ProfilePage,
// in this panel's card style. A provider also gets the Provider Details card
// (their public profile on the customer site's Workers pages).
export default function ProfilePage() {
  const { user, role } = useAuth();
  const dispatch = useDispatch();

  // Login only returns the lean user object (role not populated) - refresh
  // with the full profile every time this page is visited.
  useEffect(() => {
    dispatch(fetchProfile());
    if (role === ROLES.PROVIDER) {
      dispatch(fetchMyProviderDetails());
    }
  }, [dispatch, role]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your photo, personal details and password.</p>
      </div>

      <ProfileHero />

      <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4 sm:gap-6">
        <PersonalInfoCard />
        <ChangePasswordCard />
      </div>

      {role === ROLES.PROVIDER && <ProviderDetailsCard />}
    </div>
  );
}
