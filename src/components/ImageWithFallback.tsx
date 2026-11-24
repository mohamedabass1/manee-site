import { useState } from 'react';
import { Shield } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A2029] to-[#0E1116] text-slate-300 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-8 h-8 text-[#D97706]/80 mb-2" strokeWidth={1.5} />
        <span className="text-xs text-slate-400 px-4 text-center line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}
