'use client';

import { useState, useEffect } from 'react';
import { parseHypFile, revokeHypBlobUrl, type HypParseResult } from '@/lib/utils/hypParser';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  { ssr: false }
);

interface HypViewerProps {
  url: string;
  name: string;
}

export function HypViewer({ url, name }: HypViewerProps) {
  const [result, setResult] = useState<HypParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResult(null);

    parseHypFile(url).then((parsed) => {
      if (cancelled) return;
      if (parsed) {
        setResult(parsed);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      // Clean up previous blob URL
      if (result?.glbBlobUrl) revokeHypBlobUrl(result.glbBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (result?.glbBlobUrl) revokeHypBlobUrl(result.glbBlobUrl);
    };
  }, [result?.glbBlobUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Parsing .hyp file...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
        <div className="text-4xl">📦</div>
        <p className="text-sm text-gray-500">Could not parse .hyp file</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
          Download file
        </a>
      </div>
    );
  }

  const modelCount = result.header.assets.filter(a => a.type === 'model').length;
  const scriptCount = result.header.assets.filter(a => a.type === 'script').length;

  return (
    <div className="w-full h-full relative">
      {/* 3D preview of extracted GLB */}
      {result.glbBlobUrl ? (
        <VRMViewer
          url={result.glbBlobUrl}
          backgroundGLB={null}
          onMetadataLoad={() => {}}
          onTexturesLoad={() => {}}
          showInfoPanel={false}
          onToggleInfoPanel={() => {}}
          hideControls={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
          <div className="text-4xl">📦</div>
          <p className="text-sm text-gray-500">No 3D model found in .hyp</p>
        </div>
      )}

      {/* Hyperfy info overlay */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
        <Badge variant="secondary" className="bg-violet-600 text-white text-[10px] shadow-md">
          HYP
        </Badge>
        {result.hasScript && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] shadow-md">
            Script
          </Badge>
        )}
        {modelCount > 0 && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] shadow-md">
            {modelCount} model{modelCount > 1 ? 's' : ''}
          </Badge>
        )}
        {scriptCount > 0 && scriptCount !== (result.hasScript ? 1 : 0) && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] shadow-md">
            {scriptCount} script{scriptCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Hyperfy docs link */}
      <a
        href="https://docs.hyperfy.xyz/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400 hover:text-violet-500 transition-colors"
      >
        Powered by Hyperfy v2
      </a>
    </div>
  );
}
