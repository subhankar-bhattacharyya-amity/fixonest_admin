import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  Loader2,
  Mail,
  PencilLine,
  Save,
  ShieldCheck,
  UserPlus,
  UserRound,
  Wand2,
} from 'lucide-react';
import {
  verticalAdminValidationSchema,
  createVerticalAdminValidationSchema,
  PASSWORD_STRENGTH_LEVELS,
  getPasswordStrength,
  generateStrongPassword,
  getAdminVerticalId,
  createVerticalAdmin,
  updateVerticalAdmin,
} from '@/features/verticalAdmin/index.js';
import { getVerticalVisual } from '@/features/vertical/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { PasswordField, PhoneField } from '@/components/common/form/index.js';
import { toInternationalPhone } from '@/utils/phone.js';

const inputClass = (hasError) =>
  `input-field bg-slate-50 pl-10 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

const FIELDS = ['fullName', 'email', 'phone', 'vertical_id'];

// One modal for both "Add Vertical Admin" (no `admin`) and "Edit". Creating
// assigns the admin to the chosen vertical and sets their sign-in password.
// Edit mode pre-fills from the listing row (see verticalAdminSlice.js for why
// there's no details fetch), has no password section (the admin changes their
// own password), and sends only the fields that actually changed.
// Every vertical is selectable - a vertical can have any number of admins;
// `adminCountByVertical` (vertical id -> live admin count) is shown on each
// option for context only.
export default function VerticalAdminFormModal({
  admin = null,
  initialVerticalId = '',
  verticals,
  adminCountByVertical,
  onClose,
  onSaved,
}) {
  const dispatch = useDispatch();
  const isEdit = Boolean(admin);

  const defaultValues = useMemo(
    () =>
      isEdit
        ? {
            fullName: admin.fullName ?? '',
            email: admin.email ?? '',
            phone: toInternationalPhone(admin.phone),
            vertical_id: getAdminVerticalId(admin) ?? '',
          }
        : { fullName: '', email: '', phone: '', vertical_id: initialVerticalId, password: '', confirmPassword: '' },
    [isEdit, admin, initialVerticalId],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({
    resolver: zodResolver(isEdit ? verticalAdminValidationSchema : createVerticalAdminValidationSchema),
    defaultValues,
  });

  const [selectedVerticalId, email, password] = useWatch({ control, name: ['vertical_id', 'email', 'password'] });

  // Fill both password fields with a strong random password and copy it, so
  // the Super Admin can hand it over without retyping.
  const fillGeneratedPassword = async () => {
    const generated = generateStrongPassword();
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('password', generated, options);
    setValue('confirmPassword', generated, options);
    try {
      await navigator.clipboard.writeText(generated);
      toast.success('Strong password generated and copied', {
        description: 'Paste it somewhere safe to share with the new admin.',
      });
    } catch {
      toast.info('Strong password generated', { description: 'Use the eye icon to reveal and note it down.' });
    }
  };

  const onSubmit = async (values) => {
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        result = await dispatch(updateVerticalAdmin({ id: admin._id, payload: changes })).unwrap();
      } else {
        // eslint-disable-next-line no-unused-vars -- confirmPassword is client-only
        const { confirmPassword, ...payload } = values;
        result = await dispatch(createVerticalAdmin(payload)).unwrap();
      }
      toast.success(result.message, {
        description: isEdit ? undefined : `${values.email} can now sign in with the password you set.`,
      });
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const emailChanged = isEdit && email?.trim().toLowerCase() !== defaultValues.email;
  const verticalChanged = isEdit && selectedVerticalId !== defaultValues.vertical_id;
  const newVertical = verticals.find((vertical) => vertical._id === selectedVerticalId);

  return (
    <Modal
      title={isEdit ? 'Edit Vertical Admin' : 'Add Vertical Admin'}
      description={
        isEdit
          ? `Update ${admin.fullName}'s details or move them to another vertical.`
          : 'Assign an admin to a vertical and set their sign-in password.'
      }
      icon={isEdit ? PencilLine : UserPlus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !isDirty && (
            <span className="sm:mr-auto self-center text-xs text-slate-400 text-center sm:text-left">
              Change a field to enable saving
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vertical-admin-form"
            disabled={isSubmitting || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <UserPlus size={18} />}
            {isEdit ? 'Save Changes' : 'Create Admin'}
          </button>
        </>
      }
    >
      <form id="vertical-admin-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Person */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin details</legend>

          <IconField
            id="admin-fullName"
            label="Full name"
            icon={UserRound}
            error={errors.fullName?.message}
            input={{
              type: 'text',
              maxLength: 120,
              autoComplete: 'off',
              autoFocus: !isEdit,
              placeholder: 'e.g. Rahul Sharma',
              ...register('fullName'),
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IconField
              id="admin-email"
              label="Email"
              icon={Mail}
              error={errors.email?.message}
              hint="Used to sign in."
              input={{ type: 'email', autoComplete: 'off', placeholder: 'admin@fixonest.com', ...register('email') }}
            />
            <PhoneField id="admin-phone" label="Phone" name="phone" control={control} error={errors.phone?.message} />
          </div>

          {emailChanged && !errors.email && (
            <Callout tone="amber" icon={AlertTriangle}>
              This admin will have to sign in with the new email from now on.
            </Callout>
          )}
        </fieldset>

        {/* Vertical */}
        <fieldset>
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Assigned vertical <span className="text-rose-500">*</span>
          </legend>
          <p className="mb-3 text-xs text-slate-400">
            {isEdit
              ? 'Pick a different vertical to move this admin.'
              : 'Choose the vertical this admin will manage. A vertical can have more than one admin.'}
          </p>

          {verticals.length === 0 ? (
            <Callout tone="slate" icon={AlertTriangle}>
              No verticals exist yet. Create one under Vertical Management first.
            </Callout>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-invalid={Boolean(errors.vertical_id)}>
              {verticals.map((vertical) => {
                const count = adminCountByVertical.get(vertical._id) ?? 0;
                // In edit mode, don't count the admin being edited in their own vertical.
                const others = isEdit && vertical._id === defaultValues.vertical_id ? count - 1 : count;
                return (
                  <VerticalOption
                    key={vertical._id}
                    vertical={vertical}
                    otherAdminCount={others}
                    isCurrent={isEdit && vertical._id === defaultValues.vertical_id}
                    registration={register('vertical_id')}
                  />
                );
              })}
            </div>
          )}

          {errors.vertical_id && (
            <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
              {errors.vertical_id.message}
            </p>
          )}

          {verticalChanged && newVertical && (
            <div className="mt-3">
              <Callout tone="amber" icon={AlertTriangle}>
                {admin.fullName} will manage{' '}
                <span className="font-semibold">{newVertical.display_name || newVertical.name}</span> instead, starting
                with their next request.
              </Callout>
            </div>
          )}
        </fieldset>

        {/* Password - create only; an existing admin changes their own */}
        {!isEdit && (
          <fieldset className="space-y-4">
            <legend className="mb-3 flex w-full items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Sign-in password <span className="text-rose-500">*</span>
              </span>
              <button
                type="button"
                onClick={fillGeneratedPassword}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              >
                <Wand2 size={13} />
                Generate strong password
              </button>
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <PasswordField
                  id="admin-password"
                  label="Password"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  registration={register('password')}
                />
                <StrengthMeter password={password} />
              </div>
              <PasswordField
                id="admin-confirm-password"
                label="Confirm password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                registration={register('confirmPassword')}
              />
            </div>

            <Callout tone="teal" icon={ShieldCheck}>
              At least 8 characters with a letter and a number. Share it with the admin privately and ask them to change
              it from their Settings after the first sign-in.
            </Callout>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}

function IconField({ id, label, icon: Icon, error, hint, input }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input id={id} aria-invalid={Boolean(error)} className={inputClass(error)} {...input} />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

// A selectable vertical card. A vertical already run by another admin is
// shown but locked, with who holds it.
// A selectable vertical card. Every vertical can be chosen; the subtitle just
// says how many other admins already manage it.
function VerticalOption({ vertical, otherAdminCount, isCurrent, registration }) {
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  const label = vertical.display_name || vertical.name;

  let subtitle = 'No admin yet';
  if (otherAdminCount > 0) {
    subtitle = `${otherAdminCount} ${otherAdminCount === 1 ? 'admin' : 'admins'}${isCurrent ? ' besides this one' : ''}`;
  } else if (isCurrent) {
    subtitle = 'Current vertical';
  }

  return (
    <label className="relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-teal-300 has-checked:border-teal-500 has-checked:bg-teal-50/50 has-checked:ring-2 has-checked:ring-teal-500/20 has-focus-visible:ring-2 has-focus-visible:ring-teal-500/40">
      <input type="radio" value={vertical._id} className="peer sr-only" {...registration} />
      <span className={`w-9 h-9 shrink-0 rounded-lg ring-1 flex items-center justify-center ${tone}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 truncate">{label}</span>
        <span className="block text-xs text-slate-400 truncate">{subtitle}</span>
      </span>
      <span className="w-5 h-5 shrink-0 rounded-full border-2 border-slate-300 flex items-center justify-center text-white transition-colors peer-checked:border-teal-500 peer-checked:bg-teal-500">
        <Check size={12} strokeWidth={3} />
      </span>
    </label>
  );
}

// Four-segment bar under the password field; hidden until something is typed.
function StrengthMeter({ password }) {
  if (!password) return null;
  const score = getPasswordStrength(password);
  const level = PASSWORD_STRENGTH_LEVELS[score];
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${segment <= Math.max(score, 1) ? level.bar : 'bg-slate-100'}`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-semibold whitespace-nowrap ${level.text}`}>{level.label}</span>
    </div>
  );
}

const CALLOUT_TONES = {
  teal: 'bg-teal-50 text-teal-800',
  amber: 'bg-amber-50 text-amber-800',
  slate: 'bg-slate-50 text-slate-600',
};

function Callout({ tone, icon: Icon, children }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${CALLOUT_TONES[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
