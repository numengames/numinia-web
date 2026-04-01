import { GalleryCardSkeleton } from './GalleryCardSkeleton';

export function GallerySkeleton() {
  return (
    <div className="grid gap-2 px-3 grid-cols-2 sm:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <GalleryCardSkeleton key={i} />
      ))}
    </div>
  );
}
