import { Skeleton } from '@/components/ui/skeleton';

export function AssetDetailSkeleton() {
  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark flex flex-col">
      {/* Header placeholder */}
      <Skeleton className="h-16 w-full rounded-none" />

      <main className="flex-1 section-padding">
        <div className="container-custom">
          {/* Breadcrumb */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: 3D Viewer placeholder */}
            <Skeleton className="aspect-square w-full rounded-lg" />

            {/* Right: Details */}
            <div className="space-y-6">
              {/* Project badge */}
              <Skeleton className="h-8 w-24 rounded-lg" />
              {/* Title */}
              <Skeleton className="h-10 w-3/4" />
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              {/* Action buttons */}
              <div className="flex gap-3">
                <Skeleton className="h-10 w-40 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
              {/* Specs card */}
              <Skeleton className="h-40 w-full rounded-lg" />
              {/* License card */}
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
