import { useState } from 'react';
import { Tags } from 'lucide-react';

// A category's uploaded icon in a rounded tile. Falls back to the generic
// tag glyph when the category has no icon or its image fails to load.
export default function ServiceCategoryIcon({ src, className = 'w-10 h-10 rounded-xl', glyphSize = 20 }) {
  // Remember which URL failed, so a replaced icon gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={`shrink-0 overflow-hidden ring-1 flex items-center justify-center ${
        showImage ? 'bg-white ring-slate-200' : 'bg-teal-50 text-teal-600 ring-teal-100'
      } ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Tags size={glyphSize} />
      )}
    </span>
  );
}
