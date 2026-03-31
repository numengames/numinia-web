'use client';

import Image from 'next/image';
import { useState } from 'react';

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
      className={className}
      onError={() => setError(true)}
      priority={priority}
      {...rest}
    />
  );
}
