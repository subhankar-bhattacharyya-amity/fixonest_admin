import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Loader2,
  Mail,
  MessageSquareText,
  PencilLine,
  Save,
  ShieldCheck,
  Star,
  UserPlus,
  UserRound,
  Wand2,
} from 'lucide-react';
import { useAuth, ROLES } from '@/features/auth/index.js';
import {
  providerValidationSchema,
  superAdminProviderValidationSchema,
  createProviderValidationSchema,
  createProvider,
  updateProvider,
  updateProviderRating,
} from '@/features/provider/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { PasswordField, PhoneField } from '@/components/common/form/index.js';
import { PASSWORD_STRENGTH_LEVELS, getPasswordStrength, generateStrongPassword } from '@/utils/password.js';
import { toInternationalPhone } from '@/utils/phone.js';

const DETAIL_FIELDS = ['fullName', 'email', 'phone'];
const RATING_FIELDS = ['ratings', 'review_count'];

const inputClass = (hasError) =>
  `input-field bg-slate-50 pl-10 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add Provider" (no `provider`, Super Admin only) and "Edit
// Provider" (both roles).
//   - Create: details + the sign-in password.
//   - Edit: details, plus - for the Super Admin only - the rating and review
//     count shown on the customer site. An Admin never sees those two fields.
// Edit pre-fills from the listing row and sends only what actually changed:
// details through updateProvider, rating through updateProviderRating.
export default function ProviderFormModal({ provider = null, onClose, onSaved }) {
  const dispatch = useDispatch();
  const { role } = useAuth();
  const isEdit = Boolean(provider);
  const canRate = isEdit && role === ROLES.SUPER_ADMIN;

  const defaultValues = useMemo(
    () =>
      isEdit
        ? {
            fullName: provider.fullName ?? '',
            email: provider.email ?? '',
            phone: toInternationalPhone(provider.phone),
            ...(canRate && { ratings: provider.ratings ?? 0, review_count: provider.review_count ?? 0 }),
          }
        : { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
    [isEdit, canRate, provider],
  );

  const schema = !isEdit
    ? createProviderValidationSchema
    : canRate
      ? superAdminProviderValidationSchema
      : providerValidationSchema;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  const [email, password] = useWatch({ control, name: ['email', 'password'] });

  const fillGeneratedPassword = async () => {
    const generated = generateStrongPassword();
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue('password', generated, options);
    setValue('confirmPassword', generated, options);
    try {
      await navigator.clipboard.writeText(generated);
      toast.success('Strong password generated and copied', {
        description: 'Paste it somewhere safe to share with the new provider.',
      });
    } catch {
      toast.info('Strong password generated', { description: 'Use the eye icon to reveal and note it down.' });
    }
  };

  const onSubmit = async (values) => {
    try {
      let result;
      if (isEdit) {
        const changedOf = (fields) =>
          Object.fromEntries(
            fields.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
          );
        const changes = changedOf(DETAIL_FIELDS);
        const ratingChanges = canRate ? changedOf(RATING_FIELDS) : {};
        if (Object.keys(changes).length) {
          result = await dispatch(updateProvider({ id: provider._id, payload: changes })).unwrap();
        }
        if (Object.keys(ratingChanges).length) {
          const ratingResult = await dispatch(updateProviderRating({ id: provider._id, payload: ratingChanges })).unwrap();
          // Both saved -> one combined message instead of two toasts.
          result = result ? { ...ratingResult, message: 'Provider details and rating updated successfully' } : ratingResult;
        }
        // A field was edited and then put back - nothing to send.
        if (!result) {
          onClose();
          return;
        }
      } else {
        // eslint-disable-next-line no-unused-vars -- confirmPassword is client-only
        const { confirmPassword, ...payload } = values;
        result = await dispatch(createProvider(payload)).unwrap();
      }
      if (isEdit) {
        toast.success(result.message);
      } else if (result.data?.credentialsEmailSent) {
        // The backend emailed the login details to the new provider.
        toast.success(result.message, {
          description: 'They can sign in right away using the email and password in that email.',
          duration: 6000,
        });
      } else {
        // Account exists, but the credentials email failed - the admin must pass them on.
        toast.warning(result.message, { duration: 10000 });
      }
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const emailChanged = isEdit && email?.trim().toLowerCase() !== defaultValues.email;

  return (
    <Modal
      title={isEdit ? 'Edit Provider' : 'Add Provider'}
      description={
        isEdit
          ? canRate
            ? `Update ${provider.fullName}'s contact details and rating.`
            : `Update ${provider.fullName}'s contact details.`
          : 'Create a provider account and set their sign-in password.'
      }
      icon={isEdit ? PencilLine : UserPlus}
      size="md"
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
            form="provider-form"
            disabled={isSubmitting || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <UserPlus size={18} />}
            {isEdit ? 'Save Changes' : 'Create Provider'}
          </button>
        </>
      }
    >
      <form id="provider-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Person */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Provider details</legend>
          <IconField
            id="provider-fullName"
            label="Full name"
            icon={UserRound}
            error={errors.fullName?.message}
            input={{
              type: 'text',
              maxLength: 120,
              autoComplete: 'off',
              autoFocus: !isEdit,
              placeholder: 'e.g. Arjun Kumar Das',
              ...register('fullName'),
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IconField
              id="provider-email"
              label="Email"
              icon={Mail}
              error={errors.email?.message}
              hint="Used to sign in."
              input={{ type: 'email', autoComplete: 'off', placeholder: 'provider@fixonest.com', ...register('email') }}
            />
            <PhoneField id="provider-phone" label="Phone" name="phone" control={control} error={errors.phone?.message} />
          </div>
          {emailChanged && !errors.email && (
            <Callout tone="amber" icon={AlertTriangle}>
              This provider will have to sign in with the new email from now on.
            </Callout>
          )}
        </fieldset>

        {/* Rating - Super Admin editing only; shown on the customer site */}
        {canRate && (
          <fieldset className="space-y-4">
            <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Rating on the website
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IconField
                id="provider-ratings"
                label="Rating"
                icon={Star}
                error={errors.ratings?.message}
                hint="0 to 5, one decimal (e.g. 4.7)."
                input={{
                  type: 'number',
                  inputMode: 'decimal',
                  min: 0,
                  max: 5,
                  step: 0.1,
                  ...register('ratings', { valueAsNumber: true }),
                }}
              />
              <IconField
                id="provider-review-count"
                label="Review count"
                icon={MessageSquareText}
                error={errors.review_count?.message}
                hint="Shown next to the rating."
                input={{
                  type: 'number',
                  inputMode: 'numeric',
                  min: 0,
                  step: 1,
                  ...register('review_count', { valueAsNumber: true }),
                }}
              />
            </div>
          </fieldset>
        )}

        {/* Password - create only; an existing provider changes their own */}
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
                  id="provider-password"
                  label="Password"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  registration={register('password')}
                />
                <StrengthMeter password={password} />
              </div>
              <PasswordField
                id="provider-confirm-password"
                label="Confirm password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                registration={register('confirmPassword')}
              />
            </div>
            <Callout tone="teal" icon={ShieldCheck}>
              At least 8 characters with a letter and a number. The provider can sign in right away - share the password
              privately and ask them to change it from their Settings after the first sign-in.
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
};

function Callout({ tone, icon: Icon, children }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${CALLOUT_TONES[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
