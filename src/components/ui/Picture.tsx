'use client';

import { useState } from 'react';
import { fallbackSrc, srcSet } from '@/lib/media/picture';
import type { PictureData } from '@/lib/media/types';

interface PictureProps {
  image: PictureData | null;
  /** Value for the `sizes` attribute, e.g. "(max-width: 960px) 70vw, 340px". */
  sizes: string;
  /** Localized text shown when there is no image or it fails to load. */
  placeholder: string;
  className?: string;
  /** Above-the-fold image: loaded eagerly with high priority. */
  priority?: boolean;
  /** Purely decorative: empty alt and hidden from screen readers. */
  decorative?: boolean;
}

/** AVIF, then WebP, then the original, with reserved dimensions (no layout shift) and a placeholder on failure. */
export function Picture({ image, sizes, placeholder, className, priority = false, decorative = false }: PictureProps) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return decorative ? (
      <span className="img-ph" aria-hidden="true" />
    ) : (
      <span className="img-ph" role="img" aria-label={placeholder}>
        {placeholder}
      </span>
    );
  }

  const { derivatives: d } = image;
  return (
    <picture>
      {Object.keys(d.avif).length > 0 && <source type="image/avif" srcSet={srcSet(d.avif)} sizes={sizes} />}
      {Object.keys(d.webp).length > 0 && <source type="image/webp" srcSet={srcSet(d.webp)} sizes={sizes} />}
      <img
        src={fallbackSrc(d)}
        width={image.width}
        height={image.height}
        alt={decorative ? '' : image.alt}
        aria-hidden={decorative || undefined}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={className}
        onError={() => setFailed(true)}
      />
    </picture>
  );
}
