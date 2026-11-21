import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { KeyRound, Loader2, Save } from 'lucide-react';
import { changePassword, changePasswordValidationSchema } from '@/features/auth/index.js';
import { PasswordField } from '@/components/common/form/index.js';

export default function ChangePasswordCard() {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(changePasswordValidationSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values) => {
    try {
      const result = await dispatch(
        changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmNewPassword,
          confirmNewPassword: values.confirmNewPassword,
        }),
      ).unwrap();
      toast.success(result.message);
      reset();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  return (
    <section className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-start gap-4 p-4 sm:p-6 border-b border-slate-100">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <KeyRound size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
          <p className="text-sm text-slate-500 mt-0.5">Choose a strong password you don't use anywhere else.</p>
        </div>
      </div>

      <form
        id="change-password-form"
        className="flex-1 space-y-5 p-4 sm:p-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <PasswordField
          id="currentPassword"
          label="Current Password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          registration={register('currentPassword')}
        />
        <PasswordField
          id="newPassword"
          label="New Password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          registration={register('newPassword')}
        />
        <PasswordField
          id="confirmNewPassword"
          label="Confirm New Password"
          autoComplete="new-password"
          error={errors.confirmNewPassword?.message}
          registration={register('confirmNewPassword')}
        />
      </form>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
        <span className="text-xs text-slate-400 text-center sm:text-left">At least 8 characters, 1 letter &amp; 1 number</span>
        <div className="flex gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={() => reset()}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            form="change-password-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Update Password
          </button>
        </div>
      </div>
    </section>
  );
}
