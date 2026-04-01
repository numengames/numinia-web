import { Skeleton } from '@/components/ui/skeleton';

export function GalleryCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-2 bg-cream dark:bg-gray-900 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
