'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Check, Cloud, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ACCEPTED = '.glb,.vrm,.hyp,.mp3,.ogg,.mp4,.webm';
const GITHUB_MAX_SIZE = 3.5 * 1024 * 1024;
const R2_MAX_SIZE = 500 * 1024 * 1024;

type UploadState = 'idle' | 'selected' | 'uploading' | 'done' | 'error';
type UploadLayer = 'r2' | 'github' | null;
type UploadPhase = 'connecting' | 'uploading' | 'metadata' | 'done';

type UploadResult = {
  name: string;
  id: string;
  layer: UploadLayer;
  url: string;
};

export function AssetUpload({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>('connecting');
  const [activeLayer, setActiveLayer] = useState<UploadLayer>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.size > R2_MAX_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 500 MB.`);
      setState('error');
      return;
    }
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, ''));
    setState('selected');
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const reset = useCallback(() => {
    setFile(null);
    setName('');
    setDescription('');
    setState('idle');
    setError('');
    setProgress(0);
    setPhase('connecting');
    setActiveLayer(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const uploadPresigned = useCallback(async (f: File, trimmedName: string, trimmedDesc: string): Promise<boolean> => {
    setPhase('connecting');
    setActiveLayer('r2');

    const presignRes = await fetch('/api/admin/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: f.name,
        fileSize: f.size,
        name: trimmedName,
        description: trimmedDesc,
      }),
    });

    if (presignRes.status === 503) {
      setActiveLayer(null);
      return false;
    }

    if (!presignRes.ok) {
      const data = await presignRes.json();
      throw new Error(data.error || 'Failed to get upload URL');
    }

    const { uploadUrl, assetId, r2Key, format, displayName, description: desc } = await presignRes.json();

    setPhase('uploading');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 85));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(f);
    });

    setProgress(90);
    setPhase('metadata');

    const confirmRes = await fetch('/api/admin/presign/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, r2Key, displayName, description: desc, format, fileSize: f.size }),
    });

    if (!confirmRes.ok) {
      const data = await confirmRes.json();
      throw new Error(data.error || 'Failed to save metadata');
    }

    const confirmData = await confirmRes.json();
    setProgress(100);
    setPhase('done');
    setResult({
      name: confirmData.asset?.name ?? trimmedName,
      id: assetId,
      layer: 'r2',
      url: confirmData.asset?.url ?? '',
    });
    return true;
  }, []);

  const uploadGitHub = useCallback(async (f: File, trimmedName: string, trimmedDesc: string) => {
    setPhase('uploading');
    setActiveLayer('github');

    const formData = new FormData();
    formData.append('file', f);
    formData.append('name', trimmedName);
    formData.append('description', trimmedDesc);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    setProgress(100);
    setPhase('done');
    setResult({
      name: data.asset?.name ?? trimmedName,
      id: data.asset?.id ?? '',
      layer: 'github',
      url: data.asset?.url ?? '',
    });
  }, []);

  const upload = useCallback(async () => {
    if (!file || !name.trim()) return;

    setState('uploading');
    setError('');
    setProgress(0);
    setPhase('connecting');
    setActiveLayer(null);

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    try {
      const usedPresigned = await uploadPresigned(file, trimmedName, trimmedDesc);

      if (!usedPresigned) {
        if (file.size > GITHUB_MAX_SIZE) {
          throw new Error(
            `File is ${(file.size / 1024 / 1024).toFixed(1)} MB but R2 storage is not configured. ` +
            `GitHub upload is limited to ${(GITHUB_MAX_SIZE / 1024 / 1024).toFixed(1)} MB.`
          );
        }
        await uploadGitHub(file, trimmedName, trimmedDesc);
      }

      setState('done');
      onUploaded();
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [file, name, description, onUploaded, uploadPresigned, uploadGitHub]);

  const ext = file?.name.split('.').pop()?.toUpperCase() ?? '';
  const sizeKB = file ? Math.round(file.size / 1024) : 0;
  const sizeMB = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Asset</h2>

        {/* Drop zone */}
        {state === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragging
                ? 'border-black bg-gray-100'
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">
              Drag & drop or click to select
            </p>
            <p className="text-xs text-gray-400">
              GLB, VRM, HYP, MP3, OGG, MP4, WebM — up to 500 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        {/* File selected — metadata form */}
        {(state === 'selected' || state === 'error') && file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="bg-black text-white text-xs font-mono px-2 py-1 rounded">
                  {ext}
                </span>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400">{sizeMB}</p>
                </div>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Asset name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button onClick={upload} disabled={!name.trim()} className="w-full">
              Upload {ext}
            </Button>
          </div>
        )}

        {/* Uploading with layer feedback */}
        {state === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin" />

            {/* Layer indicator */}
            <div className="flex items-center gap-2">
              {activeLayer === 'r2' && (
                <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700">
                  <Cloud className="h-3 w-3" /> R2 CDN
                </Badge>
              )}
              {activeLayer === 'github' && (
                <Badge variant="secondary" className="gap-1">
                  <Github className="h-3 w-3" /> GitHub
                </Badge>
              )}
              {!activeLayer && (
                <span className="text-xs text-gray-400">Connecting...</span>
              )}
            </div>

            {/* Phase text */}
            <p className="text-sm text-gray-500">
              {phase === 'connecting' && 'Preparing upload...'}
              {phase === 'uploading' && `Uploading ${file?.name}...`}
              {phase === 'metadata' && 'Saving metadata to registry...'}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}%</p>
          </div>
        )}

        {/* Done with result info */}
        {state === 'done' && result && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Check className="h-8 w-8 text-green-500" />
            <p className="text-sm text-green-600 font-medium">
              &quot;{result.name}&quot; uploaded successfully
            </p>

            {/* Storage info */}
            <div className="bg-gray-50 rounded-lg p-3 w-full max-w-sm space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Storage</span>
                {result.layer === 'r2' ? (
                  <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 text-[10px]">
                    <Cloud className="h-3 w-3" /> R2 CDN
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Github className="h-3 w-3" /> GitHub
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Asset ID</span>
                <code className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-mono max-w-[200px] truncate">
                  {result.id}
                </code>
              </div>
              {result.url && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">URL</span>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-[10px] truncate max-w-[200px]"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={reset}>
              Upload another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
