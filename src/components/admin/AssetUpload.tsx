'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const ACCEPTED = '.glb,.vrm,.hyp,.mp3,.ogg';

type UploadState = 'idle' | 'selected' | 'uploading' | 'done' | 'error';

export function AssetUpload({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    // Auto-fill name from filename (without extension)
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
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const upload = useCallback(async () => {
    if (!file || !name.trim()) return;

    setState('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());
      formData.append('description', description.trim());

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setState('done');
      // Refresh the asset list after a short delay
      setTimeout(() => {
        onUploaded();
        reset();
      }, 1500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [file, name, description, onUploaded, reset]);

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
              GLB, VRM, HYP, MP3, OGG
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

        {/* Uploading */}
        {state === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-gray-500">
              Uploading {file?.name}...
            </p>
            <p className="text-xs text-gray-400">
              This may take a few seconds (committing to data repo)
            </p>
          </div>
        )}

        {/* Done */}
        {state === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Check className="h-8 w-8 text-green-500" />
            <p className="text-sm text-green-600 font-medium">
              Uploaded successfully
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
