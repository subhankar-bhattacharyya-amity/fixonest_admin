import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { Calendar, Camera, Layers, ShieldCheck, Tags } from 'lucide-react';
import {
  useAuth,
  ROLES,
  updateProfilePhoto,
  buildProfileImageUrl,
  PROFILE_IMAGE_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
} from '@/features/auth/index.js';
import { useProviderProfile } from '@/features/providerProfile/index.js';
import { buildServiceCategoryIconUrl } from '@/features/serviceCategory/index.js';
import { ServiceCategoryIcon } from '@/pages/serviceCategories/components/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { formatDate } from '@/utils/formatDate.js';

// Summary card at the top of the profile page (same idea as fixonest_frontend's
// ProfileHero): teal banner, an overlapping avatar with a click-to-upload
// camera button, name, email, identity badges, and provider assigned categories.
export default function ProfileHero() {
  const { user, role } = useAuth();
  const { details } = useProviderProfile();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please choose a PNG or JPG image.');
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error('Image must be 2MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    setUploading(true);
    try {
      const result = await dispatch(updateProfilePhoto(formData)).unwrap();
      toast.success(result.message);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="h-24 sm:h-32 bg-linear-to-r from-teal-500 to-teal-600" />

      <div className="px-4 pb-6 sm:px-8">
        {/* The avatar overlaps the banner; from sm up the text sits beside it,
            pushed down (sm:pt-16) so it always starts below the banner. */}
        <div className="-mt-12 sm:-mt-14 flex flex-col items-center sm:flex-row sm:items-start sm:gap-5">
          <div className="relative shrink-0">
            <Avatar
              src={buildProfileImageUrl(user)}
              name={user.fullName}
              alt={user.fullName ?? 'Profile'}
              className="h-24 w-24 sm:h-28 sm:w-28 text-3xl sm:text-4xl border-4 border-white shadow-sm"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-teal-500 text-white border-4 border-white shadow-sm shadow-teal-500/30 hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              <Camera size={14} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/40">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </span>
            )}
          </div>

          <div className="mt-4 sm:mt-0 sm:pt-16 min-w-0 w-full sm:flex-1 text-center sm:text-left">
            <h2 className="truncate text-xl sm:text-2xl font-bold text-slate-800">{user.fullName}</h2>
            <p className="truncate text-sm text-slate-500">{user.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {user.role_id?.display_name && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                  <ShieldCheck size={14} />
                  {user.role_id.display_name}
                </span>
              )}
              {/* Only an Admin is scoped to a vertical (Repair / Household). */}
              {user.vertical_id && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                  <Layers size={14} />
                  {user.vertical_id.display_name || user.vertical_id.name}
                </span>
              )}
              {user.createdAt && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <Calendar size={14} />
                  Member since {formatDate(new Date(user.createdAt))}
                </span>
              )}
            </div>

            {/* Provider assigned categories with status styling matching admin panel */}
            {role === ROLES.PROVIDER && details?.expertise?.length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-2.5 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
                  <Tags size={13} className="text-slate-400" /> Assigned Categories:
                </span>
                {details.expertise.map((cat) => {
                  const isPending = cat.status === 'Pending';
                  const isRejected = cat.status === 'Rejected';
                  const isApproved = !isPending && !isRejected;

                  return (
                    <span
                      key={cat._id}
                      title={
                        isPending
                          ? `${cat.name}: Pending Admin Approval`
                          : isApproved
                          ? `${cat.name}: Approved & Live on Workers tab`
                          : `${cat.name}: Rejected by Admin`
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg py-0.5 pl-1.5 pr-2 text-xs font-semibold ring-1 ring-inset transition-all ${
                        isPending
                          ? 'bg-amber-50 text-amber-900 ring-amber-300/80 border border-amber-200 shadow-xs'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-900 ring-emerald-400/80 border border-emerald-300 shadow-xs'
                          : 'opacity-50 bg-slate-100 text-slate-400 ring-slate-200 border border-slate-200 line-through'
                      }`}
                    >
                      <ServiceCategoryIcon
                        src={buildServiceCategoryIconUrl(cat)}
                        className="w-4 h-4 rounded-md"
                        glyphSize={10}
                      />
                      <span className={isRejected ? 'line-through text-slate-400' : isApproved ? 'text-emerald-900 font-semibold' : ''}>
                        {cat.name}
                      </span>
                      {isPending && (
                        <span className="shrink-0 rounded px-1.5 py-0.2 text-[10px] font-bold bg-amber-200/90 text-amber-900">
                          Pending
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
