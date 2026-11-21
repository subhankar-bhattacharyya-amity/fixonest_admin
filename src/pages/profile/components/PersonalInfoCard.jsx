import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { IdCard, Loader2, Save } from 'lucide-react';
import { useAuth, updateProfile, updateProfileValidationSchema } from '@/features/auth/index.js';
import { FormField } from '@/components/common/form/index.js';

export default function PersonalInfoCard() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updateProfileValidationSchema),
    defaultValues: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
  });

  // Keep the form's baseline in sync if the profile changes elsewhere (the
  // page's fetchProfile on mount, or a photo upload returning a fresh user) -
  // otherwise isDirty could stay stuck against stale defaults.
  useEffect(() => {
    reset({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' });
  }, [user?.fullName, user?.phone, reset]);

  const onSubmit = async (values) => {
    try {
      const result = await dispatch(updateProfile(values)).unwrap();
      toast.success(result.message);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  return (
    <section className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-start gap-4 p-4 sm:p-6 border-b border-slate-100">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <IdCard size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
          <p className="text-sm text-slate-500 mt-0.5">Update your name and phone number.</p>
        </div>
      </div>

      <form
        id="personal-info-form"
        className="flex-1 space-y-5 p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          id="fullName"
          label="Full Name"
          autoComplete="name"
          error={errors.fullName?.message}
          registration={register('fullName')}
        />

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address (Read-Only)</label>
          <input
            id="email"
            type="email"
            className="input-field bg-slate-100 text-slate-500 cursor-not-allowed"
            value={user?.email ?? ''}
            disabled
          />
        </div>

        <FormField
          id="phone"
          label="Phone Number"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          registration={register('phone')}
        />
      </form>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
        <span className="text-xs text-slate-400 text-center sm:text-left">
          {isDirty ? 'You have unsaved changes' : "Everything's up to date"}
        </span>
        <div className="flex gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={() => reset()}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            form="personal-info-form"
            disabled={isSubmitting || !isDirty}
            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>
    </section>
  );
}
