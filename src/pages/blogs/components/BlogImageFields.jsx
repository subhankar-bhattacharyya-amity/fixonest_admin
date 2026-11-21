import { useRef, useState } from 'react';
import { ImagePlus, Images, Plus, Trash2, Undo2, UploadCloud } from 'lucide-react';
import { BLOG_GALLERY_LIMIT, BLOG_IMAGE_MAX_BYTES, BLOG_IMAGE_TYPES } from '@/features/blog/index.js';

const IMAGE_MAX_MB = BLOG_IMAGE_MAX_BYTES / (1024 * 1024);

// Why a picked file can't be uploaded, or '' when it can - the same checks as
// the backend's multer.js, so a bad file never makes the round trip.
const getImageProblem = (file) => {
  if (!BLOG_IMAGE_TYPES.includes(file.type)) return 'Choose a PNG, JPG or WEBP image.';
  if (file.size > BLOG_IMAGE_MAX_BYTES) return `That image is too large - the limit is ${IMAGE_MAX_MB} MB.`;
  return '';
};

// The blog's cover: a wide preview that doubles as a drop zone.
//   previewUrl  - what to show: the newly picked file's object URL, or the saved cover's URL.
//   isNew       - a file was picked and isn't saved yet.
//   canRestore  - the saved cover was replaced or removed and can be brought back.
// The page owns the file itself; this only validates and reports picks.
export function BlogCoverField({ previewUrl, isNew, canRestore, disabled, onPick, onRemove, onRestore }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const pick = (file) => {
    if (!file) return;
    const problem = getImageProblem(file);
    setError(problem);
    if (!problem) onPick(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) pick(event.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-video overflow-hidden rounded-xl border border-dashed transition-colors ${
          isDragging ? 'border-teal-400 bg-teal-50/60' : error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
            {isNew && (
              <span className="absolute left-2 top-2 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                New
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-400 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50 disabled:cursor-not-allowed"
          >
            <ImagePlus size={28} />
            <span className="text-xs font-medium">Drop an image here, or click to browse</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50"
        >
          <UploadCloud size={14} />
          {previewUrl ? 'Replace' : 'Upload'}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              setError('');
              onRemove();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
        {canRestore && (
          <button
            type="button"
            onClick={() => {
              setError('');
              onRestore();
            }}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
          >
            <Undo2 size={14} />
            Keep current
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          Shown on the blog card and at the top of the article. PNG, JPG or WEBP up to {IMAGE_MAX_MB} MB.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={BLOG_IMAGE_TYPES.join(',')}
        onChange={(event) => {
          pick(event.target.files?.[0]);
          // Let the same file be picked again after it was removed.
          event.target.value = '';
        }}
        aria-label="Cover image"
        className="hidden"
      />
    </div>
  );
}

// The extra images shown inside the article.
//   images - [{ id, url, isNew }]: the saved ones still kept, then the newly picked.
// Several files can be picked or dropped at once; whatever doesn't fit the
// limit, or isn't a usable image, is skipped and reported.
export function BlogGalleryField({ images, disabled, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const slotsLeft = BLOG_GALLERY_LIMIT - images.length;

  const addFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const usable = files.filter((file) => !getImageProblem(file));
    const accepted = usable.slice(0, Math.max(slotsLeft, 0));

    if (usable.length < files.length) {
      setError(`Some files were skipped - use PNG, JPG or WEBP images up to ${IMAGE_MAX_MB} MB.`);
    } else if (accepted.length < usable.length) {
      setError(`A blog can have up to ${BLOG_GALLERY_LIMIT} gallery images.`);
    } else {
      setError('');
    }
    if (accepted.length > 0) onAdd(accepted);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl transition-colors ${isDragging ? 'bg-teal-50/60 ring-2 ring-teal-400/60 ring-offset-4' : ''}`}
    >
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed"
        >
          <Images size={26} />
          <span className="text-xs font-medium">Drop images here, or click to browse</span>
        </button>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <li key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img src={image.url} alt="" className="h-full w-full object-cover" />
              {image.isNew && (
                <span className="absolute left-1 top-1 rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  New
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setError('');
                  onRemove(image);
                }}
                disabled={disabled}
                aria-label="Remove image"
                title="Remove"
                className="absolute right-1 top-1 rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm backdrop-blur-sm hover:text-rose-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
          {slotsLeft > 0 && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                aria-label="Add images"
                title="Add images"
                className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
              </button>
            </li>
          )}
        </ul>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          Optional photos shown inside the article. {images.length}/{BLOG_GALLERY_LIMIT} added.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={BLOG_IMAGE_TYPES.join(',')}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
        aria-label="Gallery images"
        className="hidden"
      />
    </div>
  );
}
