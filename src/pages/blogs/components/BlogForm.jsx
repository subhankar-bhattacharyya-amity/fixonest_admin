import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Clock3,
  Eye,
  Flame,
  Info,
  Link2,
  Loader2,
  LogOut,
  Save,
  Send,
  TrendingUp,
  UserRound,
  Wand2,
} from 'lucide-react';
import { ROLES } from '@/features/auth/index.js';
import {
  BLOG_STATUS,
  BLOG_HIGHLIGHT_LIMIT,
  BLOG_TITLE_MAX,
  BLOG_SLUG_MAX,
  BLOG_EXCERPT_MAX,
  BLOG_AUTHOR_MAX,
  blogValidationSchema,
  buildBlogImageUrl,
  slugifyBlogTitle,
  estimateReadingTime,
  createBlog,
  updateBlog,
} from '@/features/blog/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { RichTextEditor } from '@/components/common/richText/index.js';
import { ROUTES, getBlogsPath } from '@/routes/constants.js';
import { BlogCoverField, BlogGalleryField } from './BlogImageFields.jsx';
import BlogTagsField from './BlogTagsField.jsx';

// Compared one by one against what the form opened with, so an edit sends
// only the fields that changed. Tags are compared separately (an array).
const SCALAR_FIELDS = ['title', 'slug', 'blogCategoryId', 'writtenBy', 'excerpt', 'content', 'isPublished', 'isPopular', 'isTrendy'];

const sameTags = (a, b) => a.length === b.length && a.every((tag, index) => tag === b[index]);

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// The write/edit form behind BlogEditorPage - "Write Blog" when `blog` is
// null, "Edit Blog" otherwise. The article (title, slug, content, summary) is
// on the left; publishing options, category, author, tags and images sit in
// a side column that drops below it on smaller screens.
//
// The slug follows the title while "Auto" is on - the default when writing.
// When editing, the existing slug is kept (it's the blog's URL) until it is
// edited or Auto is switched back on. An edit sends only what changed.
// `summary` is the listing's counts, used to show how many popular/trendy
// slots are left; null until it has loaded.
export default function BlogForm({ blog = null, categories, categoriesReady, role, authorName, summary }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isEdit = Boolean(blog);
  const listPath = getBlogsPath(role);
  const contentLabelId = useId();

  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Cover: a newly picked file, and whether the saved cover was taken off.
  const [coverFile, setCoverFile] = useState(null); // null | { file, previewUrl }
  const [coverRemoved, setCoverRemoved] = useState(false);
  // Gallery: saved images marked for removal, and newly picked files.
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newImages, setNewImages] = useState([]); // [{ id, file, previewUrl }]

  // Every preview URL made here is freed when the form unmounts.
  const objectUrls = useRef([]);
  const makePreviewUrl = (file) => {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    return url;
  };
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const defaultValues = useMemo(
    () => ({
      title: blog?.title ?? '',
      slug: blog?.slug ?? '',
      blogCategoryId: blog?.blogCategoryId?._id ?? blog?.blogCategoryId ?? '',
      writtenBy: blog?.writtenBy ?? authorName ?? '',
      excerpt: blog?.excerpt ?? '',
      content: blog?.content ?? '',
      tags: blog?.tags ?? [],
      // A new blog starts as published; an existing one keeps its own state.
      isPublished: blog ? Boolean(blog.isPublished) : true,
      isPopular: Boolean(blog?.isPopular),
      isTrendy: Boolean(blog?.isTrendy),
    }),
    [blog, authorName],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({ resolver: zodResolver(blogValidationSchema), defaultValues });

  const [title = '', slug = '', excerpt = '', content = '', tags = [], isPublished, isPopular, isTrendy, blogCategoryId] =
    useWatch({
      control,
      name: ['title', 'slug', 'excerpt', 'content', 'tags', 'isPublished', 'isPopular', 'isTrendy', 'blogCategoryId'],
    });

  const write = (field, value) => setValue(field, value, { shouldDirty: true, shouldValidate: isSubmitted });

  const titleField = register('title', {
    onChange: (event) => {
      if (autoSlug) write('slug', slugifyBlogTitle(event.target.value));
    },
  });

  // Typing in the slug takes it over; spaces become hyphens as you type.
  const slugField = register('slug', {
    onChange: (event) => {
      setAutoSlug(false);
      write('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'));
    },
  });

  const toggleAutoSlug = () => {
    if (!autoSlug) write('slug', slugifyBlogTitle(getValues('title')));
    setAutoSlug(!autoSlug);
  };

  // ----- Cover -----
  const savedCoverUrl = buildBlogImageUrl(blog?.coverImage);
  const coverPreviewUrl = coverFile?.previewUrl ?? (coverRemoved ? null : savedCoverUrl);
  const coverChanged = Boolean(coverFile) || coverRemoved;

  const pickCover = (file) => setCoverFile({ file, previewUrl: makePreviewUrl(file) });
  const removeCover = () => {
    setCoverFile(null);
    setCoverRemoved(Boolean(savedCoverUrl));
  };
  const restoreCover = () => {
    setCoverFile(null);
    setCoverRemoved(false);
  };

  // ----- Gallery -----
  const galleryImages = useMemo(
    () => [
      ...(blog?.images ?? [])
        .filter((image) => image.image_url && !removedImageIds.includes(image._id))
        .map((image) => ({ id: image._id, url: buildBlogImageUrl(image.image_url), isNew: false })),
      ...newImages.map((image) => ({ id: image.id, url: image.previewUrl, isNew: true })),
    ],
    [blog, removedImageIds, newImages],
  );
  const galleryChanged = removedImageIds.length > 0 || newImages.length > 0;

  const addGalleryFiles = (files) =>
    setNewImages((current) => [
      ...current,
      ...files.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: makePreviewUrl(file) })),
    ]);
  const removeGalleryImage = (image) => {
    if (image.isNew) setNewImages((current) => current.filter((item) => item.id !== image.id));
    else setRemovedImageIds((current) => [...current, image.id]);
  };

  const hasChanges = isDirty || coverChanged || galleryChanged;

  // Warn before a reload or tab close throws unsaved writing away.
  useEffect(() => {
    if (!hasChanges || isSubmitting) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges, isSubmitting]);

  const leave = useCallback(() => navigate(listPath), [navigate, listPath]);
  const requestLeave = () => (hasChanges ? setConfirmLeave(true) : leave());
  const closeConfirmLeave = useCallback(() => setConfirmLeave(false), []);

  const onSubmit = async (values) => {
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          SCALAR_FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        if (!sameTags(values.tags, defaultValues.tags)) changes.tags = values.tags;
        // A retitled blog would get a new slug derived by the backend - send
        // the one shown here so the URL only changes when it was changed.
        if (changes.title) changes.slug = values.slug;
        if (coverRemoved && !coverFile) changes.coverImage = '';

        result = await dispatch(
          updateBlog({
            id: blog._id,
            changes,
            coverFile: coverFile?.file,
            removedImageIds,
            galleryFiles: newImages.map((image) => image.file),
          }),
        ).unwrap();
      } else {
        result = await dispatch(
          createBlog({
            ...values,
            coverFile: coverFile?.file,
            galleryFiles: newImages.map((image) => image.file),
          }),
        ).unwrap();
      }
      toast.success(result.message);
      navigate(listPath);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor -
      // including the 409 for a title or slug that's already taken.
    }
  };

  const onInvalid = () => toast.error('Some details need your attention before saving.');

  const slugChanged = isEdit && slug.trim() !== defaultValues.slug;
  const readingTime = estimateReadingTime(title, content);

  // The selected category may have been deleted since the blog was written.
  const categoryMissing =
    categoriesReady && Boolean(blogCategoryId) && !categories.some((category) => category._id === blogCategoryId);

  // A highlight slot is free when under the limit, or when this blog already holds one.
  const slotFree = (count, alreadyHeld) => !summary || alreadyHeld || count < BLOG_HIGHLIGHT_LIMIT;
  const canBePopular = slotFree(summary?.popular, defaultValues.isPopular);
  const canBeTrendy = slotFree(summary?.trendy, defaultValues.isTrendy);

  const SubmitIcon = isEdit ? Save : isPublished ? Send : Save;
  const submitLabel = isEdit ? 'Save Changes' : isPublished ? 'Publish Blog' : 'Save as Hidden';

  const actions = (
    <>
      <button
        type="button"
        onClick={requestLeave}
        disabled={isSubmitting}
        className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting || (isEdit && !hasChanges)}
        className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <SubmitIcon size={18} />}
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={requestLeave}
            disabled={isSubmitting}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={14} />
            Back to blogs
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{isEdit ? 'Edit Blog' : 'Write Blog'}</h1>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {isEdit ? `Update “${blog.title}”.` : 'Write an article and publish it to the customer site.'}
          </p>
        </div>
        <div className="hidden sm:flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        {/* ---------- The article ---------- */}
        <Card title="Article" description="What customers will read.">
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="blog-title" className="text-sm font-medium text-gray-700">
                  Title <span className="text-rose-500">*</span>
                </label>
                <Counter value={title.length} max={BLOG_TITLE_MAX} />
              </div>
              <input
                id="blog-title"
                type="text"
                maxLength={BLOG_TITLE_MAX}
                autoComplete="off"
                autoFocus={!isEdit}
                placeholder="e.g. 5 Signs You Need a Professional Plumber"
                aria-invalid={Boolean(errors.title)}
                className={`${fieldClass(errors.title)} py-2.5 text-base font-semibold text-slate-800 placeholder:font-normal`}
                {...titleField}
              />
              <FieldError error={errors.title} />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="blog-slug" className="text-sm font-medium text-gray-700">
                  Slug <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={toggleAutoSlug}
                  disabled={isSubmitting}
                  aria-pressed={autoSlug}
                  title={autoSlug ? 'The slug follows the title' : 'Generate the slug from the title'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50 ${
                    autoSlug ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Wand2 size={12} />
                  {autoSlug ? 'Auto from title' : 'Generate from title'}
                </button>
              </div>
              <div className="relative">
                <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="blog-slug"
                  type="text"
                  maxLength={BLOG_SLUG_MAX}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="5-signs-you-need-a-professional-plumber"
                  aria-invalid={Boolean(errors.slug)}
                  className={`${fieldClass(errors.slug)} pl-10 font-mono text-sm`}
                  {...slugField}
                />
              </div>
              {errors.slug ? (
                <FieldError error={errors.slug} />
              ) : (
                <p className="text-xs text-slate-400">The blog's web address. Lowercase letters, numbers and hyphens only.</p>
              )}
              {slugChanged && !errors.slug && (
                <Callout tone="amber" icon={AlertTriangle}>
                  Changing the slug changes this blog's web address. Links to{' '}
                  <span className="font-mono font-semibold break-all">/{defaultValues.slug}</span> will stop working.
                </Callout>
              )}
            </div>

            {/* Content */}
            <div className="space-y-1">
              <p id={contentLabelId} className="text-sm font-medium text-gray-700">
                Content <span className="text-rose-500">*</span>
              </p>
              <RichTextEditor
                value={defaultValues.content}
                onChange={(html) => write('content', html)}
                placeholder="Tell the story… Use the toolbar for headings, lists, quotes and links."
                invalid={Boolean(errors.content)}
                disabled={isSubmitting}
                labelledBy={contentLabelId}
                footerNote={
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    About {readingTime} min read
                  </span>
                }
              />
              <FieldError error={errors.content} />
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="blog-excerpt" className="text-sm font-medium text-gray-700">
                  Summary <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <Counter value={excerpt.length} max={BLOG_EXCERPT_MAX} />
              </div>
              <textarea
                id="blog-excerpt"
                rows={3}
                placeholder="One or two lines that make a reader want to open the article."
                aria-invalid={Boolean(errors.excerpt)}
                className={`${fieldClass(errors.excerpt)} resize-none`}
                {...register('excerpt')}
              />
              {errors.excerpt ? (
                <FieldError error={errors.excerpt} />
              ) : (
                <p className="text-xs text-slate-400">
                  Shown on the blog card. Leave it empty to use the opening lines of the content.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ---------- Side column ---------- */}
        <div className="space-y-6">
          <Card title="Publishing" compact>
            <div className="space-y-3">
              <SwitchRow
                icon={Eye}
                tone="bg-emerald-50 text-emerald-600"
                label={isPublished ? 'Published' : 'Hidden'}
                hint={isPublished ? 'Visible on the customer site.' : 'Saved, but customers cannot see it.'}
                checked={isPublished}
                disabled={isSubmitting}
                onChange={(checked) => {
                  write('isPublished', checked);
                  // A hidden blog can't be popular or trendy (the backend refuses it).
                  if (!checked) {
                    write('isPopular', false);
                    write('isTrendy', false);
                  }
                }}
              />
              <SwitchRow
                icon={Flame}
                tone="bg-amber-50 text-amber-600"
                label="Popular"
                hint={isPublished ? highlightHint(summary?.popular, canBePopular) : 'Publish the blog to highlight it.'}
                checked={isPopular}
                disabled={isSubmitting || !isPublished || (!canBePopular && !isPopular)}
                onChange={(checked) => write('isPopular', checked)}
              />
              <SwitchRow
                icon={TrendingUp}
                tone="bg-sky-50 text-sky-600"
                label="Trendy"
                hint={isPublished ? highlightHint(summary?.trendy, canBeTrendy) : 'Publish the blog to highlight it.'}
                checked={isTrendy}
                disabled={isSubmitting || !isPublished || (!canBeTrendy && !isTrendy)}
                onChange={(checked) => write('isTrendy', checked)}
              />
            </div>
          </Card>

          <Card title="Details" compact>
            <div className="space-y-4">
              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="blog-category" className="text-sm font-medium text-gray-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="blog-category"
                    aria-invalid={Boolean(errors.blogCategoryId)}
                    disabled={!categoriesReady}
                    className={`${fieldClass(errors.blogCategoryId)} appearance-none pr-9 cursor-pointer disabled:cursor-wait`}
                    // Controlled, so the choice survives the options arriving after the form.
                    value={blogCategoryId ?? ''}
                    onChange={(event) => write('blogCategoryId', event.target.value)}
                  >
                    <option value="">{categoriesReady ? 'Choose a category' : 'Loading categories…'}</option>
                    {/* Keeps the saved value selected while the list loads, or if its category is gone. */}
                    {blogCategoryId && (!categoriesReady || categoryMissing) && (
                      <option value={blogCategoryId}>{blog?.blogCategoryId?.name ?? 'Current category'}</option>
                    )}
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                        {category.status === BLOG_STATUS.INACTIVE ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <FieldError error={errors.blogCategoryId} />
                {categoriesReady && categories.length === 0 && (
                  <Callout tone="slate" icon={Info}>
                    No blog categories exist yet.{' '}
                    {role === ROLES.SUPER_ADMIN ? (
                      <Link to={ROUTES.BLOG_CATEGORIES} className="font-semibold text-teal-700 underline underline-offset-2">
                        Create one first
                      </Link>
                    ) : (
                      'Ask the Super Admin to create one first.'
                    )}
                  </Callout>
                )}
              </div>

              {/* Author */}
              <div className="space-y-1">
                <label htmlFor="blog-author" className="text-sm font-medium text-gray-700">
                  Written by <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="blog-author"
                    type="text"
                    maxLength={BLOG_AUTHOR_MAX}
                    autoComplete="off"
                    placeholder="e.g. Fixonest Team"
                    aria-invalid={Boolean(errors.writtenBy)}
                    className={`${fieldClass(errors.writtenBy)} pl-10`}
                    {...register('writtenBy')}
                  />
                </div>
                <FieldError error={errors.writtenBy} />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label htmlFor="blog-tags" className="text-sm font-medium text-gray-700">
                  Tags <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <BlogTagsField
                  id="blog-tags"
                  value={tags}
                  onChange={(next) => write('tags', next)}
                  disabled={isSubmitting}
                  error={errors.tags?.message}
                />
              </div>
            </div>
          </Card>

          <Card title="Cover image" compact>
            <BlogCoverField
              previewUrl={coverPreviewUrl}
              isNew={Boolean(coverFile)}
              canRestore={Boolean(savedCoverUrl) && coverChanged}
              disabled={isSubmitting}
              onPick={pickCover}
              onRemove={removeCover}
              onRestore={restoreCover}
            />
          </Card>

          <Card title="Gallery" compact>
            <BlogGalleryField
              images={galleryImages}
              disabled={isSubmitting}
              onAdd={addGalleryFiles}
              onRemove={removeGalleryImage}
            />
          </Card>
        </div>
      </div>

      {/* Actions again at the end of the form - the only ones on a phone */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 sm:px-6">
        {isEdit && !hasChanges && (
          <span className="sm:mr-auto text-xs text-slate-400 text-center sm:text-left">Change something to enable saving</span>
        )}
        {actions}
      </div>

      {confirmLeave && (
        <ConfirmDialog
          title="Leave without saving?"
          icon={LogOut}
          tone="warning"
          confirmLabel="Yes, Leave"
          cancelLabel="Keep Writing"
          onCancel={closeConfirmLeave}
          onConfirm={leave}
          message="Your changes to this blog haven't been saved and will be lost."
        />
      )}
    </form>
  );
}

const highlightHint = (count, hasFreeSlot) => {
  if (count === undefined) return `Up to ${BLOG_HIGHLIGHT_LIMIT} blogs at a time.`;
  if (!hasFreeSlot) return `All ${BLOG_HIGHLIGHT_LIMIT} slots are in use.`;
  return `${count} of ${BLOG_HIGHLIGHT_LIMIT} slots in use.`;
};

// Same card + header bar as the listing pages. No overflow-hidden here: it
// would stop the editor's toolbar from sticking while the article scrolls.
function Card({ title, description, compact = false, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className={`px-4 sm:px-6 border-b border-slate-100 ${compact ? 'py-3.5' : 'py-4'}`}>
        <h2 className={`font-bold text-slate-800 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Counter({ value, max }) {
  return (
    <span className={`shrink-0 text-[11px] tabular-nums ${value > max ? 'font-semibold text-rose-500' : 'text-slate-400'}`}>
      {value}/{max}
    </span>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-xs font-medium text-rose-500">
      {error.message}
    </p>
  );
}

function SwitchRow({ icon: Icon, tone, label, hint, checked, disabled, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-teal-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

const CALLOUT_TONES = {
  amber: 'bg-amber-50 text-amber-800',
  slate: 'bg-slate-50 text-slate-600',
};

function Callout({ tone, icon: Icon, children }) {
  return (
    <p className={`mt-2 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${CALLOUT_TONES[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
