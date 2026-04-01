'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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
  const [loaded, setLoaded] = useState(false);
  const imgSrc = error || !src ? '/placeholder.png' : src;

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        fill={fill && !width}
        width={width}
        height={height}
        sizes={fill && !width ? sizes : undefined}
        className={cn(className, !loaded && 'opacity-0')}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        priority={priority}
        {...rest}
      />
    </>
  );
}
