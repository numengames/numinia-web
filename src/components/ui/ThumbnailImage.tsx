'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Tiny 4x4 warm gray SVG encoded as base64 — matches the cream palette.
// Renders as a soft blur placeholder until the real image loads.
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#D4D0C8"/></svg>'
  );

interface ThumbnailImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function ThumbnailImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  className = 'object-cover',
  priority,
  ...rest
}: ThumbnailImageProps) {
  const [error, setError] = useState(false);
  const imgSrc = error || !src ? '/placeholder.png' : src;

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill && !width}
      width={width}
      height={height}
      sizes={fill && !width ? sizes : undefined}
      className={cn(className)}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      onError={() => setError(true)}
      priority={priority}
      {...rest}
    />
  );
}
