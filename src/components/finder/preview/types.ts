import * as THREE from 'three';
import type { FileTypeInfo as _FileTypeInfo } from '../utils/fileTypes';
import type { Avatar as _Avatar, Project as _Project } from '@/types/avatar';

export type { FileTypeInfo } from '../utils/fileTypes';
export type { Avatar, Project } from '@/types/avatar';

export interface PreviewPanelProps {
  avatar: _Avatar | null;
  selectedFile: _FileTypeInfo | null;
  projects: _Project[];
}

export interface VRMMetadata {
  title?: string;
  author?: string;
  version?: string;
  contactInformation?: string;
  reference?: string;
  licenseType?: number;
  licenseName?: string;
  allowedUserName?: number;
  commercialUsageName?: number;
  violentUsageName?: number;
  sexualUsageName?: number;
  otherPermissions?: string;
}

export interface ModelStats {
  fileSize: string;
  format: string;
  height: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  bones: number;
}

export interface ExtractedTexture {
  name: string;
  type: string;
  mapType: string;
  texture: THREE.Texture;
  material: string;
  fileSize: string;
}
