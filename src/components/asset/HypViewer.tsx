'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseHypFile, revokeHypBlobUrls, type HypParseResult } from '@/lib/utils/hypParser';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Check, Download, FileCode, Box, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  { ssr: false }
);

interface HypViewerProps {
  url: string;
  name: string;
}

type HypTab = 'preview' | 'files' | 'script' | 'props';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
      {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

export function HypViewer({ url, name }: HypViewerProps) {
  const [result, setResult] = useState<HypParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<HypTab>('preview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResult(null);
    setTab('preview');

    parseHypFile(url).then((parsed) => {
      if (cancelled) return;
      if (parsed) {
        setResult(parsed);
        // If no model, default to files tab
        if (!parsed.glbBlobUrl) setTab('files');
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (result) revokeHypBlobUrls(result); };
  }, [result]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.hyp`;
    a.click();
  }, [url, name]);

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
        <button onClick={handleDownload} className="text-xs text-blue-500 hover:underline">Download .hyp</button>
      </div>
    );
  }

  const modelCount = result.files.filter(f => f.asset.type === 'model').length;
  const scriptCount = result.files.filter(f => f.asset.type === 'script').length;
  const propsJson = JSON.stringify(result.header.blueprint, null, 2);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900" role="region" aria-label={`Hyperfy app: ${name}`}>
      {/* Tab bar — madjin style */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-cream dark:bg-cream-dark shrink-0">
        <div className="flex items-center gap-1">
          {result.glbBlobUrl && (
            <button
              onClick={() => setTab('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'preview' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Box className="h-3 w-3 inline mr-1" />Preview
            </button>
          )}
          <button
            onClick={() => setTab('files')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'files' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Files ({result.files.length}) · {formatSize(result.totalSize)}
          </button>
          {result.scriptText && (
            <button
              onClick={() => setTab('script')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'script' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileCode className="h-3 w-3 inline mr-1" />Script
            </button>
          )}
          <button
            onClick={() => setTab('props')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'props' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Settings className="h-3 w-3 inline mr-1" />Props
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          <Download className="h-3 w-3" /> .hyp
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Preview tab — 3D viewer */}
        {tab === 'preview' && result.glbBlobUrl && (
          <VRMViewer
            url={result.glbBlobUrl}
            backgroundGLB={null}
            onMetadataLoad={() => {}}
            onTexturesLoad={() => {}}
            showInfoPanel={false}
            onToggleInfoPanel={() => {}}
            hideControls={false}
          />
        )}

        {/* Preview fallback — no model */}
        {tab === 'preview' && !result.glbBlobUrl && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <FileCode className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500">Script-only app (no 3D model)</p>
            <button onClick={() => setTab('script')} className="text-xs text-violet-500 hover:underline">
              View Script
            </button>
          </div>
        )}

        {/* Files tab */}
        {tab === 'files' && (
          <div className="h-full overflow-y-auto p-3">
            <div className="space-y-1">
              {result.files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className={`text-[9px] shrink-0 ${
                      f.asset.type === 'model' ? 'bg-blue-100 text-blue-700' :
                      f.asset.type === 'script' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {f.asset.type}
                    </Badge>
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">{f.asset.url}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{formatSize(f.asset.size)}</span>
                </div>
              ))}
            </div>

            {/* Blueprint info */}
            <div className="mt-4 p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="text-xs font-medium text-gray-900 dark:text-white">{result.name}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="bg-violet-100 text-violet-700 text-[9px]">HYP</Badge>
                {result.hasScript && <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[9px]">Script</Badge>}
                {modelCount > 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[9px]">{modelCount} model{modelCount > 1 ? 's' : ''}</Badge>}
                {result.header.blueprint.frozen && <Badge variant="secondary" className="bg-red-100 text-red-700 text-[9px]">Frozen</Badge>}
              </div>
              <a href="https://docs.hyperfy.xyz/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-500 hover:text-violet-700">
                Hyperfy v2 Docs
              </a>
            </div>
          </div>
        )}

        {/* Script tab */}
        {tab === 'script' && result.scriptText && (
          <div className="h-full flex flex-col">
            <div className="flex justify-end p-2 shrink-0">
              <CopyButton text={result.scriptText} />
            </div>
            <div className="flex-1 overflow-auto px-3 pb-3">
              <pre className="text-xs font-mono text-green-400 bg-gray-950 rounded-lg p-4 overflow-x-auto whitespace-pre min-h-full">
                {result.scriptText}
              </pre>
            </div>
          </div>
        )}

        {tab === 'script' && !result.scriptText && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-gray-500">No script in this app</p>
          </div>
        )}

        {/* Props / Blueprint tab */}
        {tab === 'props' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-end p-2 shrink-0">
              <CopyButton text={propsJson} />
            </div>
            <div className="flex-1 overflow-auto px-3 pb-3">
              <pre className="text-xs font-mono text-blue-300 bg-gray-950 rounded-lg p-4 overflow-x-auto whitespace-pre min-h-full">
                {propsJson}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
