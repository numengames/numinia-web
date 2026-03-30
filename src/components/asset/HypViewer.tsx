'use client';

import { useState, useEffect } from 'react';
import { parseHypFile, revokeHypBlobUrl, type HypParseResult } from '@/lib/utils/hypParser';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info, X } from 'lucide-react';
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
  const [showInfo, setShowInfo] = useState(false);

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
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          title="App info"
        >
          {showInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
        </button>
      </div>

      {/* Metadata panel */}
      {showInfo && (
        <div className="absolute top-2 right-2 z-10 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 text-xs">
          <div className="font-semibold text-gray-900 dark:text-white truncate">{result.name}</div>
          <div className="space-y-1">
            {result.header.assets.map((asset, i) => (
              <div key={i} className="flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${
                    asset.type === 'model' ? 'bg-blue-100 text-blue-700' :
                    asset.type === 'script' ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {asset.type}
                  </Badge>
                  <span className="truncate max-w-[100px]">{asset.url}</span>
                </div>
                <span className="text-gray-400 shrink-0">{(asset.size / 1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>
          {result.header.blueprint.props && Object.keys(result.header.blueprint.props).length > 0 && (
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Props</div>
              {Object.entries(result.header.blueprint.props).map(([key, val]) => (
                <div key={key} className="flex justify-between text-gray-500">
                  <span>{key}</span>
                  <span className="text-gray-400">{String((val as Record<string, unknown>)?.type || 'unknown')}</span>
                </div>
              ))}
            </div>
          )}
          <a
            href="https://docs.hyperfy.xyz/"
            target="_blank" rel="noopener noreferrer"
            className="block text-[10px] text-violet-500 hover:text-violet-700 pt-1"
          >
            Hyperfy v2 Docs
          </a>
        </div>
      )}

      {/* Hyperfy docs link (when panel closed) */}
      {!showInfo && (
        <a
          href="https://docs.hyperfy.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400 hover:text-violet-500 transition-colors"
        >
          Powered by Hyperfy v2
        </a>
      )}
    </div>
  );
}
