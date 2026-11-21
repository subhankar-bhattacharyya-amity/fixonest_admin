import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  BriefcaseBusiness,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  Loader2,
  PencilLine,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  UploadCloud,
  UserPlus,
  UserRound,
} from 'lucide-react';
import {
  TEAM_MEMBER_STATUS,
  TEAM_MEMBER_NAME_MAX,
  TEAM_MEMBER_DESIGNATION_MAX,
  TEAM_MEMBER_LINKEDIN_MAX,
  TEAM_MEMBER_AVATAR_TYPES,
  TEAM_MEMBER_AVATAR_MAX_BYTES,
  DESIGNATION_SUGGESTIONS,
  teamMemberValidationSchema,
  buildTeamMemberAvatarUrl,
  normalizeLinkedinUrl,
  createTeamMember,
  updateTeamMember,
} from '@/features/teamMember/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import LinkedinIcon from './LinkedinIcon.jsx';

const AVATAR_MAX_MB = TEAM_MEMBER_AVATAR_MAX_BYTES / (1024 * 1024);
const TEXT_FIELDS = ['name', 'designation', 'linkedin'];

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add Team Member" (no `member`) and "Edit Team Member". A
// new member goes to the end of the About page's team (`nextOrder`); their
// position is changed afterwards with the listing's arrows. Edit pre-fills
// from the listing card and sends only what actually changed. A live
// preview beside the form shows the card exactly as the website will.
export default function TeamMemberFormModal({ member = null, nextOrder, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(member);
  const fileInputRef = useRef(null);

  // A newly picked photo ({ file, previewUrl }), and whether the current one
  // should be removed on save.
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const defaultValues = useMemo(
    () => ({
      name: member?.name ?? '',
      designation: member?.designation ?? '',
      linkedin: member?.linkedin ?? '',
      isActive: member ? member.status !== TEAM_MEMBER_STATUS.INACTIVE : true,
    }),
    [member],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(teamMemberValidationSchema), defaultValues });

  const [name = '', designation = '', linkedin = '', isActive] = useWatch({
    control,
    name: ['name', 'designation', 'linkedin', 'isActive'],
  });

  // Free the preview's object URL when it's replaced or the modal closes.
  useEffect(() => {
    if (!photo) return undefined;
    return () => URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  const pickPhoto = (file) => {
    if (!file) return;
    if (!TEAM_MEMBER_AVATAR_TYPES.includes(file.type)) {
      setPhotoError('Choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > TEAM_MEMBER_AVATAR_MAX_BYTES) {
      setPhotoError(`That image is too large - the limit is ${AVATAR_MAX_MB} MB.`);
      return;
    }
    setPhotoError('');
    setRemovePhoto(false);
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileChange = (event) => {
    pickPhoto(event.target.files?.[0]);
    // Let the same file be picked again after it was removed.
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isSubmitting) pickPhoto(event.dataTransfer.files?.[0]);
  };

  const existingPhotoUrl = buildTeamMemberAvatarUrl(member?.avatar);
  const photoUrl = photo?.previewUrl ?? (removePhoto ? null : existingPhotoUrl);
  const hasChanges = isDirty || Boolean(photo) || removePhoto;

  // Only offer a "check" link once what's typed looks like a real address.
  const linkedinHref = normalizeLinkedinUrl(linkedin);
  const canOpenLinkedin = !errors.linkedin && /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(linkedinHref);

  const chooseDesignation = (title) =>
    setValue('designation', title, { shouldDirty: true, shouldValidate: true, shouldTouch: true });

  const onSubmit = async (values) => {
    const status = values.isActive ? TEAM_MEMBER_STATUS.ACTIVE : TEAM_MEMBER_STATUS.INACTIVE;
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          TEXT_FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        if (values.isActive !== defaultValues.isActive) changes.status = status;
        if (photo) changes.avatarFile = photo.file;
        else if (removePhoto) changes.avatar = '';
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        result = await dispatch(updateTeamMember({ id: member._id, payload: changes })).unwrap();
      } else {
        result = await dispatch(
          createTeamMember({
            name: values.name,
            designation: values.designation,
            // An empty link is simply left out.
            linkedin: values.linkedin || undefined,
            order: nextOrder,
            status,
            avatarFile: photo?.file,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Team Member' : 'Add Team Member'}
      description={
        isEdit ? `Update ${member.name}'s card on the About page.` : 'Introduce a new person in the About page’s “Meet the team”.'
      }
      icon={isEdit ? PencilLine : UserPlus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !hasChanges && (
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
            form="team-member-form"
            disabled={isSubmitting || (isEdit && !hasChanges)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <UserPlus size={18} />}
            {isEdit ? 'Save Changes' : 'Add Member'}
          </button>
        </>
      }
    >
      <form
        id="team-member-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_14rem]"
      >
        <div className="min-w-0 space-y-6">
          {/* Photo - click or drop an image */}
          <fieldset>
            <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Photo</legend>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
                isDragging
                  ? 'border-teal-400 bg-teal-50/60'
                  : photoError
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                aria-label={photoUrl ? 'Replace photo' : 'Upload photo'}
                className="group/photo relative mx-auto sm:mx-0 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              >
                {photoUrl ? (
                  <Avatar
                    src={photoUrl}
                    name={name}
                    alt={name ? `${name}'s photo` : 'Team member photo'}
                    className="h-20 w-20 text-xl ring-4 ring-white shadow-md shadow-slate-300/60"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200 transition-colors group-hover/photo:text-teal-500 group-hover/photo:ring-teal-200">
                    <ImagePlus size={28} />
                  </span>
                )}
                {photo && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-2 ring-white">
                    New
                  </span>
                )}
              </button>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-medium text-gray-700">
                  Profile photo <span className="font-normal text-slate-400">(recommended)</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {photo
                    ? photo.file.name
                    : removePhoto
                      ? 'The current photo will be removed - initials show instead.'
                      : `A square headshot works best. PNG, JPG or WEBP up to ${AVATAR_MAX_MB} MB.`}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50"
                  >
                    <UploadCloud size={14} />
                    {photoUrl ? 'Replace photo' : 'Upload photo'}
                  </button>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
                    >
                      <Undo2 size={14} />
                      {existingPhotoUrl && !removePhoto ? 'Keep current' : 'Remove'}
                    </button>
                  )}
                  {!photo && existingPhotoUrl && !removePhoto && (
                    <button
                      type="button"
                      onClick={() => setRemovePhoto(true)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Remove photo
                    </button>
                  )}
                  {!photo && removePhoto && (
                    <button
                      type="button"
                      onClick={() => setRemovePhoto(false)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
                    >
                      <Undo2 size={14} />
                      Keep current
                    </button>
                  )}
                </div>
                {photoError && (
                  <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
                    {photoError}
                  </p>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={TEAM_MEMBER_AVATAR_TYPES.join(',')}
                onChange={handleFileChange}
                aria-label="Team member photo"
                className="hidden"
              />
            </div>
          </fieldset>

          {/* Details */}
          <fieldset className="space-y-4">
            <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Details</legend>

            <div className="space-y-1">
              <label htmlFor="team-member-name" className="text-sm font-medium text-gray-700">
                Full name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserRound
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="team-member-name"
                  type="text"
                  autoFocus={!isEdit}
                  maxLength={TEAM_MEMBER_NAME_MAX}
                  placeholder="e.g. Ritika Sen"
                  aria-invalid={Boolean(errors.name)}
                  className={`${fieldClass(errors.name)} pl-9`}
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="team-member-designation" className="text-sm font-medium text-gray-700">
                Designation <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BriefcaseBusiness
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="team-member-designation"
                  type="text"
                  maxLength={TEAM_MEMBER_DESIGNATION_MAX}
                  placeholder="e.g. Head of Operations"
                  aria-invalid={Boolean(errors.designation)}
                  className={`${fieldClass(errors.designation)} pl-9`}
                  {...register('designation')}
                />
              </div>
              {errors.designation ? (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.designation.message}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Sparkles size={11} className="text-amber-400" />
                    Quick pick:
                  </span>
                  {DESIGNATION_SUGGESTIONS.map((title) => {
                    const selected = designation.trim() === title;
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => chooseDesignation(title)}
                        disabled={isSubmitting}
                        aria-pressed={selected}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50 ${
                          selected
                            ? 'bg-teal-500 text-white ring-teal-500'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:ring-teal-200'
                        }`}
                      >
                        {title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="team-member-linkedin" className="text-sm font-medium text-gray-700">
                LinkedIn profile <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <LinkedinIcon
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="team-member-linkedin"
                    type="url"
                    inputMode="url"
                    maxLength={TEAM_MEMBER_LINKEDIN_MAX}
                    placeholder="linkedin.com/in/ritika-sen"
                    aria-invalid={Boolean(errors.linkedin)}
                    className={`${fieldClass(errors.linkedin)} pl-9`}
                    {...register('linkedin')}
                  />
                </div>
                <a
                  href={canOpenLinkedin ? linkedinHref : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!canOpenLinkedin}
                  title={canOpenLinkedin ? 'Open the profile in a new tab to check it' : 'Enter a link to check it'}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ring-1 ring-inset transition-colors ${
                    canOpenLinkedin
                      ? 'text-sky-700 ring-sky-200 bg-sky-50 hover:bg-sky-100'
                      : 'pointer-events-none text-slate-300 ring-slate-200 bg-white'
                  }`}
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Check</span>
                </a>
              </div>
              {errors.linkedin ? (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.linkedin.message}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  No need to type “https://” - it’s added for you. Leave empty to show the icon without a link.
                </p>
              )}
            </div>

            {/* Visibility */}
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  disabled={isSubmitting}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-60 ${
                    field.value ? 'bg-emerald-50/60 ring-emerald-100' : 'bg-slate-50 ring-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      field.value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    {field.value ? <Eye size={17} /> : <EyeOff size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-700">
                      {field.value ? 'Live on the website' : 'Hidden from the website'}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {field.value
                        ? 'Shown in the About page’s team section as soon as you save.'
                        : 'Saved here as a draft. Customers won’t see this card until you turn this on.'}
                    </span>
                  </span>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${field.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        field.value ? 'translate-x-5' : ''
                      }`}
                    />
                  </span>
                </button>
              )}
            />
          </fieldset>
        </div>

        {/* Live preview - shaped like the customer site's team card */}
        <aside className="md:sticky md:top-0 self-start rounded-2xl border border-slate-100 bg-linear-to-br from-slate-50 to-teal-50/40 p-3.5">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Globe size={12} />
            Website preview
            {!isActive && <span className="ml-auto normal-case tracking-normal font-medium text-slate-400">Hidden</span>}
          </p>
          <div
            className={`mx-auto flex max-w-56 flex-col items-center rounded-3xl bg-white p-5 text-center shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 transition-opacity ${
              isActive ? '' : 'opacity-60'
            }`}
          >
            <span className="rounded-full bg-linear-to-br from-teal-400 to-teal-600 p-1">
              <Avatar src={photoUrl} name={name || '?'} className="h-24 w-24 text-2xl ring-4 ring-white" />
            </span>
            <p className={`mt-4 w-full truncate text-sm font-semibold ${name.trim() ? 'text-slate-900' : 'text-slate-400'}`}>
              {name.trim() || 'Full name'}
            </p>
            <p className={`mt-1 w-full truncate text-xs ${designation.trim() ? 'text-slate-500' : 'text-slate-300'}`}>
              {designation.trim() || 'Designation'}
            </p>
            <span
              className={`mt-4 flex h-8 w-8 items-center justify-center rounded-full border ${
                canOpenLinkedin ? 'border-teal-200 bg-teal-50 text-teal-600' : 'border-slate-200 text-slate-500'
              }`}
              title={canOpenLinkedin ? 'Links to the LinkedIn profile' : 'No link yet'}
            >
              <LinkedinIcon size={16} />
            </span>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
            Exactly how the card appears in “The people building Fixonest.”
          </p>
        </aside>
      </form>
    </Modal>
  );
}
