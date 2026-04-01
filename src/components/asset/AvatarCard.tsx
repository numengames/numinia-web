///src/components/avatar/AvatarCard.tsx
'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from '@/lib/utils/formatters';
import { ThumbnailImage } from '@/components/ui/ThumbnailImage';

interface AvatarCardProps {
  avatar: {
    id: string;
    name: string;
    project: string;
    createdAt: string;
    thumbnailUrl: string | null;
  };
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClick: (avatar: AvatarCardProps['avatar']) => void;
}

export const AvatarCard: React.FC<AvatarCardProps> = ({
  avatar,
  isSelected,
  isActive,
  onSelect,
  onClick,
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(avatar.id);
  };

  const thumbnailSrc = avatar.thumbnailUrl || '/placeholder.png';

  return (
    <Card
      className={`cursor-pointer hover:border-primary-500 transition-all overflow-hidden
        ${isActive ? 'border-black shadow-md' : 'border-gray-200'}`}
      onClick={() => onClick(avatar)}
    >
      <CardContent className="flex items-center p-3 gap-3">
        {/* Checkbox */}
        <div onClick={handleCheckboxClick} className="flex-shrink-0">
          <Checkbox checked={isSelected} className="h-4 w-4" />
        </div>

        {/* Thumbnail */}
        <div className="h-14 w-14 sm:h-16 sm:w-16 relative flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
          <ThumbnailImage
            src={thumbnailSrc}
            alt={avatar.name}
            className="object-cover transition-transform hover:scale-105"
          />
        </div>

        {/* Asset info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-gray-900 truncate">
            {avatar.name}
          </h3>
          <p className="text-xs text-gray-500 truncate">{avatar.project}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(avatar.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
