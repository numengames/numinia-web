import React from 'react';
import type { FileTypeInfo } from './types';

// Helper function to format file size
export const formatFileSize = (bytes: number | null | undefined, t?: (key: string) => string): string => {
  if (!bytes || bytes === 0) return t ? t('finder.common.unknown') : 'Unknown';

  const k = 1024;
  const sizes = [
    t ? t('finder.fileSizeUnits.bytes') : 'Bytes',
    t ? t('finder.fileSizeUnits.kb') : 'KB',
    t ? t('finder.fileSizeUnits.mb') : 'MB',
    t ? t('finder.fileSizeUnits.gb') : 'GB'
  ];

  // Calculate the appropriate unit index
  let i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure we use at least KB for files >= 1024 bytes
  if (bytes >= k && i < 1) i = 1;
  // Ensure we use at least MB for files >= 1 MB
  if (bytes >= k * k && i < 2) i = 2;
  // Ensure we use at least GB for files >= 1 GB
  if (bytes >= k * k * k && i < 3) i = 3;

  // Clamp to valid array index
  i = Math.min(i, sizes.length - 1);
  i = Math.max(i, 0);

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format file size in MB (for model files - always shows in MB even if < 1 MB)
export const formatFileSizeInMB = (bytes: number | null | undefined, t?: (key: string) => string): string => {
  if (!bytes || bytes === 0) return t ? t('finder.common.unknown') : 'Unknown';

  const k = 1024;
  const mbUnit = t ? t('finder.fileSizeUnits.mb') : 'MB';
  const gbUnit = t ? t('finder.fileSizeUnits.gb') : 'GB';

  // If file is >= 1 GB, show in GB
  if (bytes >= k * k * k) {
    const gb = bytes / (k * k * k);
    return parseFloat(gb.toFixed(2)) + ' ' + gbUnit;
  }

  // Otherwise, always show in MB (even if < 1 MB, e.g., "0.5 MB")
  const mb = bytes / (k * k);
  return parseFloat(mb.toFixed(2)) + ' ' + mbUnit;
};

// Helper to get download button text
export const getDownloadButtonText = (selectedFile: FileTypeInfo | null, avatar: { name?: string } | null, t?: (key: string) => string): string => {
  if (!avatar) return t ? t('finder.common.download') : 'Download';
  if (selectedFile) {
    return `${t ? t('finder.common.download') : 'Download'} ${selectedFile.label}`;
  }
  return t ? t('finder.common.downloadAllFiles') : 'Download All Files';
};

// Helper to extract just the format from labels like "Thumbnail: PNG" -> "PNG"
export const extractFormat = (label: string): string => {
  // If label contains a colon, take the part after it
  const colonIndex = label.indexOf(':');
  if (colonIndex !== -1) {
    return label.substring(colonIndex + 1).trim();
  }
  return label;
};

// Helper to get file format from file info
export const getFileFormat = (file: FileTypeInfo | null): string => {
  if (!file) return 'Unknown';

  // First, try to get format from label (most reliable)
  if (file.label) {
    const format = extractFormat(file.label);
    // If format looks valid (not the full label), return it
    if (format && format.length <= 10 && !format.includes(' ')) {
      return format;
    }
    // Check if label contains format info
    const labelLower = file.label.toLowerCase();
    if (labelLower.includes('vrm')) return 'VRM';
    if (labelLower.includes('fbx')) return 'FBX';
    if (labelLower.includes('glb')) return 'GLB';
    if (labelLower.includes('gltf')) return 'GLTF';
  }

  // Check file ID
  if (file.id) {
    const fileId = file.id.toLowerCase();
    if (fileId === 'vrm' || fileId === 'vrm_main' || fileId === 'voxel_vrm') return 'VRM';
    if (fileId === 'fbx' || fileId === 'voxel_fbx') return 'FBX';
    if (fileId === 'glb') return 'GLB';
  }

  // Check filename extension
  if (file.filename) {
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (ext) {
      const extMap: Record<string, string> = {
        'vrm': 'VRM',
        'fbx': 'FBX',
        'glb': 'GLB',
        'gltf': 'GLTF',
      };
      if (extMap[ext]) return extMap[ext];
      return ext.toUpperCase();
    }
  }

  // Check URL extension as last resort
  if (file.url) {
    const urlExt = file.url.split('.').pop()?.toLowerCase() || null;
    if (urlExt && urlExt.length <= 5) {
      const extMap: Record<string, string> = {
        'vrm': 'VRM',
        'fbx': 'FBX',
        'glb': 'GLB',
        'gltf': 'GLTF',
      };
      if (extMap[urlExt]) return extMap[urlExt];
    }
  }

  return 'Unknown';
};

// Helper to check if a string is a URL (IPFS, HTTP, HTTPS)
export const isUrl = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return trimmed.startsWith('http://') ||
         trimmed.startsWith('https://') ||
         trimmed.startsWith('ipfs://') ||
         trimmed.startsWith('ar://') ||
         /^[a-zA-Z0-9]{46}$/.test(trimmed); // Arweave transaction ID
};

// Helper to get license type name
export const getLicenseTypeName = (licenseType: string | number | null | undefined, licenseName?: string, otherPermissions?: string, t?: (key: string) => string): string => {
  // If there's an IPFS/URL link in otherPermissions, it's likely "Other"
  if (otherPermissions && isUrl(otherPermissions)) {
    return t ? t('finder.licenseTypes.other') : 'Other';
  }

  // IMPORTANT: If licenseName is provided, use it directly
  if (licenseName && typeof licenseName === 'string' && licenseName.trim() !== '') {
    const cleanName = licenseName.trim();
    // Format: Replace underscores with spaces and capitalize correctly
    if (cleanName.includes('_')) {
      // Special case for common Creative Commons formats
      if (cleanName.startsWith('CC_')) {
        return cleanName.replace(/_/g, ' ');
      }
      // For other underscore formats, just replace underscores
      return cleanName.replace(/_/g, ' ');
    }
    return cleanName;
  }

  // Only fall back to numeric mapping if no licenseName is provided
  // Convert to number if it's a string containing only digits
  if (typeof licenseType === 'string' && /^\d+$/.test(licenseType)) {
    licenseType = parseInt(licenseType, 10);
  }

  // Standard VRM license mapping as per the spec
  const licenseTypes: Record<number, string> = {
    0: t ? t('finder.licenseTypes.redistributionProhibited') : 'Redistribution Prohibited',
    1: t ? t('finder.licenseTypes.cc0') : 'CC0',
    2: t ? t('finder.licenseTypes.ccBy') : 'CC BY',
    3: t ? t('finder.licenseTypes.ccByNc') : 'CC BY NC',
    4: t ? t('finder.licenseTypes.ccBySa') : 'CC BY SA',
    5: t ? t('finder.licenseTypes.ccByNcSa') : 'CC BY NC SA',
    6: t ? t('finder.licenseTypes.ccByNd') : 'CC BY ND',
    7: t ? t('finder.licenseTypes.ccByNcNd') : 'CC BY NC ND',
    8: t ? t('finder.licenseTypes.other') : 'Other'
  };

  return licenseTypes[licenseType as number] || (t ? t('finder.common.unknown') : 'Unknown');
};

// Helper to extract URLs from text and make them clickable
export const renderLinkableText = (text: string): React.ReactNode => {
  if (!text) return text;

  // Check if the entire text is a URL
  if (isUrl(text)) {
    const url = text.trim();
    const displayUrl = url.length > 50 ? `${url.substring(0, 47)}...` : url;
    return (
      React.createElement('a', {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-600 dark:text-blue-400 hover:underline break-all',
      }, displayUrl)
    );
  }

  // Check if text contains URLs
  const urlRegex = /(https?:\/\/[^\s]+|ipfs:\/\/[^\s]+|ar:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (isUrl(part)) {
      const displayUrl = part.length > 50 ? `${part.substring(0, 47)}...` : part;
      return React.createElement('a', {
        key: index,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-600 dark:text-blue-400 hover:underline break-all',
      }, displayUrl);
    }
    return React.createElement('span', { key: index }, part);
  });
};

// Helper to get allowed user name
export const getAllowedUserName = (allowedUser: string | number | null | undefined, t?: (key: string) => string): string => {
  // Convert to number if it's a string containing only digits
  if (typeof allowedUser === 'string' && /^\d+$/.test(allowedUser)) {
    allowedUser = parseInt(allowedUser, 10);
  }

  // Check if it's a string matching the values
  if (typeof allowedUser === 'string') {
    if (allowedUser.toLowerCase() === 'everyone') {
      return t ? t('finder.permissions.everyone') : 'Everyone';
    } else if (allowedUser.toLowerCase().includes('explicit') ||
               allowedUser.toLowerCase().includes('contact')) {
      return t ? t('finder.permissions.explicitUser') : 'Explicit User';
    } else if (allowedUser.toLowerCase().includes('author') ||
               allowedUser.toLowerCase().includes('only')) {
      return t ? t('finder.permissions.onlyAuthor') : 'Only Author';
    }
  }

  const allowedUsers: Record<number, string> = {
    0: t ? t('finder.permissions.onlyAuthor') : 'Only Author',
    1: t ? t('finder.permissions.everyone') : 'Everyone',
    2: t ? t('finder.permissions.explicitUser') : 'Explicit User'
  };

  return allowedUsers[allowedUser as number] || (t ? t('finder.common.unknown') : 'Unknown');
};

// Helper to get usage permission name
export const getUsageName = (usage: string | number | boolean | null | undefined, t?: (key: string) => string): string => {
  // For VRM 0.x format: 0 = Disallow, 1 = Allow
  if (usage === 0 || usage === '0') {
    return t ? t('finder.usage.disallow') : 'Disallow';
  } else if (usage === 1 || usage === '1') {
    return t ? t('finder.usage.allow') : 'Allow';
  } else if (typeof usage === 'string') {
    // Handle string values (case insensitive)
    const value = usage.toLowerCase().trim();
    if (value === 'allow' || value === 'allowed' || value === 'yes' || value === 'true') {
      return t ? t('finder.usage.allow') : 'Allow';
    } else {
      return t ? t('finder.usage.disallow') : 'Disallow';
    }
  } else if (usage === true) {
    return t ? t('finder.usage.allow') : 'Allow';
  } else if (usage === false) {
    return t ? t('finder.usage.disallow') : 'Disallow';
  }

  // Default fallback
  return t ? t('finder.usage.disallow') : 'Disallow';
};
