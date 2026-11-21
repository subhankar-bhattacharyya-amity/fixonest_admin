import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Images, Plus, Trash2, Undo2, UploadCloud } from 'lucide-react';
import { SERVICE_GALLERY_LIMIT, SERVICE_IMAGE_MAX_BYTES, SERVICE_IMAGE_TYPES } from '@/features/service/index.js';
import { moveItem } from './moveItem.js';

const IMAGE_MAX_MB = SERVICE_IMAGE_MAX_BYTES / (1024 * 1024);

// Why a picked file can't be uploaded, or '' when it can - the same checks as
// the backend's multer.js, so a bad file never makes the round trip.
const getImageProblem = (file) => {
  if (!SERVICE_IMAGE_TYPES.includes(file.type)) return 'Choose a PNG, JPG or WEBP image.';
  if (file.size > SERVICE_IMAGE_MAX_BYTES) return `That image is too large - the limit is ${IMAGE_MAX_MB} MB.`;
  return '';
};

const dropZoneHandlers = (setIsDragging, onFiles, disabled) => ({
  onDragOver: (event) => {
    if (!event.dataTransfer.types?.includes('Files')) return;
    event.preventDefault();
    setIsDragging(true);
  },
  onDragLeave: () => setIsDragging(false),
  onDrop: (event) => {
    if (!event.dataTransfer.files?.length) return;
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) onFiles(event.dataTransfer.files);
  },
});

// The service's cover: the card image customers see in listings, and the big
// image on its details page. A wide preview that doubles as a drop zone.
//   previewUrl - the newly picked file's object URL, or the saved cover's URL.
//   isNew      - a file was picked and isn't saved yet.
//   canRestore - the saved cover was replaced or removed and can be brought back.
export function ServiceCoverField({ previewUrl, isNew, canRestore, disabled, onPick, onRemove, onRestore }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const pick = (file) => {
    if (!file) return;
    const problem = getImageProblem(file);
    setError(problem);
    if (!problem) onPick(file);
  };

  return (
    <div>
      <div
        {...dropZoneHandlers(setIsDragging, (files) => pick(files[0]), disabled)}
        className={`relative aspect-16/10 overflow-hidden rounded-xl border border-dashed transition-colors ${
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
            <ImagePlus size={30} />
            <span className="text-sm font-semibold">Add a cover image</span>
            <span className="text-xs">Drop it here, or click to browse</span>
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
          Shown on the service card and at the top of its details page. PNG, JPG or WEBP up to {IMAGE_MAX_MB} MB.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={SERVICE_IMAGE_TYPES.join(',')}
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
        aria-label="Cover image"
        className="hidden"
      />
    </div>
  );
}

// The extra photos on the details page, in display order.
//   images - [{ id, url, isNew }]: kept saved images and newly picked ones, in order.
// Several files can be picked or dropped at once; whatever doesn't fit the
// limit, or isn't a usable image, is skipped and reported. Tiles are dragged
// (or nudged with the arrows) into a new order.
export function ServiceGalleryField({ images, disabled, onAdd, onRemove, onReorder }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const slotsLeft = SERVICE_GALLERY_LIMIT - images.length;

  const addFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const usable = files.filter((file) => !getImageProblem(file));
    const accepted = usable.slice(0, Math.max(slotsLeft, 0));
    if (usable.length < files.length) {
      setError(`Some files were skipped - use PNG, JPG or WEBP images up to ${IMAGE_MAX_MB} MB.`);
    } else if (accepted.length < usable.length) {
      setError(`A service can have up to ${SERVICE_GALLERY_LIMIT} gallery images.`);
    } else {
      setError('');
    }
    if (accepted.length > 0) onAdd(accepted);
  };

  return (
    <div
      {...dropZoneHandlers(setIsDragging, addFiles, disabled)}
      className={`rounded-xl transition-colors ${isDragging ? 'bg-teal-50/60 ring-2 ring-teal-400/60 ring-offset-4' : ''}`}
    >
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed"
        >
          <Images size={28} />
          <span className="text-sm font-semibold">Add gallery photos</span>
          <span className="text-xs">Drop several at once, or click to browse</span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable={!disabled}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragIndex(index);
              }}
              onDragOver={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                if (dragIndex !== index) {
                  onReorder(moveItem(images, dragIndex, index));
                  setDragIndex(index);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`group relative aspect-4/3 cursor-grab overflow-hidden rounded-xl bg-slate-100 ring-1 transition-all ${
                dragIndex === index ? 'ring-2 ring-teal-400 opacity-70 scale-95' : 'ring-slate-200'
              }`}
            >
              <img src={image.url} alt="" draggable={false} className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                {index + 1}
              </span>
              {image.isNew && (
                <span className="absolute left-8 top-1.5 rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
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
                aria-label={`Remove image ${index + 1}`}
                title="Remove"
                className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm backdrop-blur-sm hover:text-rose-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                <NudgeButton
                  label={`Move image ${index + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => onReorder(moveItem(images, index, index - 1))}
                >
                  <ArrowLeft size={13} />
                </NudgeButton>
                <NudgeButton
                  label={`Move image ${index + 1} later`}
                  disabled={disabled || index === images.length - 1}
                  onClick={() => onReorder(moveItem(images, index, index + 1))}
                >
                  <ArrowRight size={13} />
                </NudgeButton>
              </div>
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
                className="flex aspect-4/3 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                <span className="text-[11px] font-semibold">Add</span>
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
          Shown on the details page after the cover, in this order. Drag to reorder · {images.length}/{SERVICE_GALLERY_LIMIT}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={SERVICE_IMAGE_TYPES.join(',')}
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

function NudgeButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-lg bg-white/90 p-1 text-slate-600 shadow-sm backdrop-blur-sm hover:text-teal-700 transition-colors disabled:invisible"
    >
      {children}
    </button>
  );
}
