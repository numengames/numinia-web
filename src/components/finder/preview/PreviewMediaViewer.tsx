'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { HypViewer } from '@/components/asset/HypViewer';
import { STLViewer } from '@/components/asset/STLViewer';
import type { FileTypeInfo } from './types';

const VRMViewer = dynamic(
  () => import('@/components/VRMViewer/VRMViewer').then((mod) => mod.VRMViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading viewer...</p>
      </div>
    ),
  }
);

interface PreviewMediaViewerProps {
  previewFile: FileTypeInfo | null;
  avatar: { name: string; modelFileUrl: string | null } | null;
  correctedFilename: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureRef: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleMetadataLoad: (metadata: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleTexturesLoad: (textures: any[]) => void;
  onImageClick: (url: string, alt: string, filename: string, downloadHandler: () => void) => void;
  onDownload: () => void;
}

function AudioWaveform({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
      <div className="flex items-end gap-[2px] h-12">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
            style={{
              height: `${12 + Math.sin(i * 0.5) * 20 + Math.random() * 16}px`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.8 + Math.random() * 0.4}s`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black rounded-lg">
      <video key={url} src={url} controls autoPlay muted loop playsInline className="max-w-full max-h-full object-contain rounded" />
    </div>
  );
}

function AudioPlayer({ url, label }: { url: string; label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
      <AudioWaveform label={label} />
      <audio key={url} src={url} controls autoPlay className="w-full max-w-[220px]" />
    </div>
  );
}

function renderMedia(
  url: string,
  label: string,
  category: string | undefined,
  props: PreviewMediaViewerProps,
) {
  if (/\.(mp4|webm)$/i.test(url)) return <VideoPlayer url={url} />;
  if (/\.(mp3|ogg)$/i.test(url)) return <AudioPlayer url={url} label={label} />;
  if (/\.hyp$/i.test(url)) return <HypViewer key={url} url={url} name={label} />;
  if (/\.stl$/i.test(url)) return <STLViewer key={url} url={url} name={label} />;

  if (category === 'model' || (!category && !/\.(jpg|jpeg|png|webp|gif)$/i.test(url))) {
    return (
      <VRMViewer
        key={url}
        url={url}
        backgroundGLB={null}
        onMetadataLoad={props.handleMetadataLoad}
        onTexturesLoad={props.handleTexturesLoad}
        showInfoPanel={false}
        onToggleInfoPanel={() => {}}
        hideControls={true}
        cameraDistanceMultiplier={0.6}
        captureRef={props.captureRef}
      />
    );
  }

  return null;
}

export function PreviewMediaViewer(props: PreviewMediaViewerProps) {
  const { previewFile, avatar, correctedFilename, onImageClick, onDownload } = props;

  // Selected file preview
  if (previewFile?.url) {
    // Images (thumbnail/texture)
    if ((previewFile.category === 'thumbnail' || previewFile.category === 'texture') && !/\.(mp4|webm|mp3|ogg|vrm|glb|gltf|fbx|hyp)$/i.test(previewFile.url)) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800">
          <img
            src={previewFile.url}
            alt={previewFile.label}
            className="max-w-full max-h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
            onError={(e) => { const el = e.currentTarget; if (!el.src.includes('/placeholder.png')) el.src = '/placeholder.png'; }}
            onClick={() => onImageClick(previewFile.url!, previewFile.label, correctedFilename || previewFile.filename || '', onDownload)}
          />
        </div>
      );
    }

    // Media (video/audio/3D/hyp)
    const media = renderMedia(previewFile.url, previewFile.label || avatar?.name || '', previewFile.category, props);
    if (media) return media;
  }

  // Fallback to avatar's main model
  if (avatar?.modelFileUrl) {
    const media = renderMedia(avatar.modelFileUrl, avatar.name, undefined, props);
    if (media) return media;
  }

  return null;
}
