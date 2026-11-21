import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { AlertTriangle, Link2, Loader2, PencilLine, Plus, Save, Tag, Wand2 } from 'lucide-react';
import {
  BLOG_CATEGORY_NAME_MAX,
  BLOG_CATEGORY_SLUG_MAX,
  BLOG_CATEGORY_DESCRIPTION_MAX,
  blogCategoryValidationSchema,
  slugifyBlogCategoryName,
  createBlogCategory,
  updateBlogCategory,
} from '@/features/blogCategory/index.js';
import { Modal } from '@/components/common/modal/index.js';

const FIELDS = ['name', 'slug', 'description'];

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add Blog Category" (no `category`) and "Edit Blog Category".
// The slug follows the name while "Auto" is on - the default when adding. When
// editing, the existing slug is kept (it's the category's URL) until the Super
// Admin edits it or switches Auto back on. Edit pre-fills from the listing row
// and sends only what actually changed.
// There is no status field: a new category is created Active (the backend's
// default), and status is changed with the listing's activate/deactivate action.
export default function BlogCategoryFormModal({ category = null, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(category);
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
    }),
    [category],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({ resolver: zodResolver(blogCategoryValidationSchema), defaultValues });

  const [name = '', slug = '', description = ''] = useWatch({
    control,
    name: ['name', 'slug', 'description'],
  });

  const writeSlug = (value) => setValue('slug', value, { shouldDirty: true, shouldValidate: isSubmitted });

  const nameField = register('name', {
    onChange: (event) => {
      if (autoSlug) writeSlug(slugifyBlogCategoryName(event.target.value));
    },
  });

  // Typing in the slug takes it over; spaces become hyphens as you type.
  const slugField = register('slug', {
    onChange: (event) => {
      setAutoSlug(false);
      writeSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'));
    },
  });

  const toggleAutoSlug = () => {
    if (!autoSlug) writeSlug(slugifyBlogCategoryName(getValues('name')));
    setAutoSlug(!autoSlug);
  };

  const onSubmit = async (values) => {
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        // A renamed category would get a new slug derived by the backend -
        // send the one shown here so the URL only changes when it was changed.
        if (changes.name) changes.slug = values.slug;
        result = await dispatch(updateBlogCategory({ id: category._id, payload: changes })).unwrap();
      } else {
        result = await dispatch(
          createBlogCategory({
            name: values.name,
            slug: values.slug,
            // An empty description is simply left out.
            description: values.description || undefined,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor -
      // including the 409 for a name or slug that's already taken.
    }
  };

  const slugChanged = isEdit && slug.trim() !== defaultValues.slug;

  return (
    <Modal
      title={isEdit ? 'Edit Blog Category' : 'Add Blog Category'}
      description={isEdit ? `Update ${category.name}'s details.` : 'Create a category to group blog posts under.'}
      icon={isEdit ? PencilLine : Plus}
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
            form="blog-category-form"
            disabled={isSubmitting || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </>
      }
    >
      <form id="blog-category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category details</legend>

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="blog-category-name" className="text-sm font-medium text-gray-700">
              Category name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="blog-category-name"
                type="text"
                maxLength={BLOG_CATEGORY_NAME_MAX}
                autoComplete="off"
                autoFocus={!isEdit}
                placeholder="e.g. Home Care Tips"
                aria-invalid={Boolean(errors.name)}
                className={`${fieldClass(errors.name)} pl-10`}
                {...nameField}
              />
            </div>
            {errors.name ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Shown to blog readers. Must be unique across all blog categories.</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="blog-category-slug" className="text-sm font-medium text-gray-700">
                Slug <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={toggleAutoSlug}
                disabled={isSubmitting}
                aria-pressed={autoSlug}
                title={autoSlug ? 'The slug follows the name' : 'Generate the slug from the name'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50 ${
                  autoSlug ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Wand2 size={12} />
                {autoSlug ? 'Auto from name' : 'Generate from name'}
              </button>
            </div>
            <div className="relative">
              <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="blog-category-slug"
                type="text"
                maxLength={BLOG_CATEGORY_SLUG_MAX}
                autoComplete="off"
                spellCheck={false}
                placeholder="home-care-tips"
                aria-invalid={Boolean(errors.slug)}
                className={`${fieldClass(errors.slug)} pl-10 font-mono text-sm`}
                {...slugField}
              />
            </div>
            {errors.slug ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.slug.message}
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                The category's web address. Lowercase letters, numbers and hyphens only.
              </p>
            )}
            {slugChanged && !errors.slug && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Changing the slug changes this category's web address. Links to{' '}
                  <span className="font-mono font-semibold">/{defaultValues.slug}</span> will stop working.
                </span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="blog-category-description" className="text-sm font-medium text-gray-700">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <span
                className={`text-[11px] tabular-nums ${
                  description.length > BLOG_CATEGORY_DESCRIPTION_MAX ? 'font-semibold text-rose-500' : 'text-slate-400'
                }`}
              >
                {description.length}/{BLOG_CATEGORY_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="blog-category-description"
              rows={3}
              placeholder="A short line about the posts in this category."
              aria-invalid={Boolean(errors.description)}
              className={`${fieldClass(errors.description)} resize-none`}
              {...register('description')}
            />
            {errors.description && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.description.message}
              </p>
            )}
          </div>
        </fieldset>

        {/* Preview - how the row will read in the listing */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
          <span
            className="w-10 h-10 shrink-0 rounded-xl bg-white ring-1 ring-slate-200 text-teal-600 flex items-center justify-center text-base font-bold uppercase"
            aria-hidden="true"
          >
            {name.trim().charAt(0) || '#'}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preview</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{name.trim() || 'Category name'}</p>
            <p className="text-xs font-mono text-slate-400 truncate">/{slug.trim() || 'category-slug'}</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
