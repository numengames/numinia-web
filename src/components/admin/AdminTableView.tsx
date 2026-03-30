"use client";

import React, { useState, useMemo } from "react";
import { Eye, EyeOff, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Avatar {
  id: string;
  name: string;
  project: string;
  description: string;
  createdAt: string;
  thumbnailUrl: string | null;
  modelFileUrl: string | null;
  polygonCount: number;
  format: string;
  materialCount: number;
  isPublic: boolean;
  isDraft: boolean;
  storage?: { r2?: string; ipfs_cid?: string; arweave_tx?: string; github_raw?: string };
  status?: string;
  version?: string;
  file_size_bytes?: number;
}

type SortKey =
  | "name"
  | "format"
  | "file_size_bytes"
  | "status"
  | "version"
  | "createdAt";

type SortDirection = "asc" | "desc";

interface AdminTableViewProps {
  avatars: Avatar[];
  busyIds?: Set<string>;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsset?: (avatar: Avatar) => void;
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "\u2014";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function getStatusLabel(avatar: Avatar): string {
  if (avatar.status === "deprecated") return "deprecated";
  if (!avatar.isPublic) return "hidden";
  return "active";
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "hidden":
      return "bg-yellow-100 text-yellow-800";
    case "deprecated":
      return "bg-red-100 text-red-700";
    default:
      return "";
  }
}

export default function AdminTableView({
  avatars,
  busyIds,
  onToggleVisibility,
  onDelete,
  onSelectAsset,
}: AdminTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedAvatars = useMemo(() => {
    const sorted = [...avatars].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "format":
          cmp = (a.format || "").localeCompare(b.format || "");
          break;
        case "file_size_bytes":
          cmp = (a.file_size_bytes ?? 0) - (b.file_size_bytes ?? 0);
          break;
        case "status": {
          const statusOrder: Record<string, number> = { active: 0, hidden: 1, deprecated: 2 };
          cmp = (statusOrder[getStatusLabel(a)] ?? 3) - (statusOrder[getStatusLabel(b)] ?? 3);
          break;
        }
        case "version":
          cmp = (a.version || "").localeCompare(b.version || "");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [avatars, sortKey, sortDirection]);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">Img</TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("name")}
          >
            Name <SortIcon column="name" />
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("format")}
          >
            Format <SortIcon column="format" />
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("file_size_bytes")}
          >
            Size <SortIcon column="file_size_bytes" />
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("status")}
          >
            Status <SortIcon column="status" />
          </TableHead>
          <TableHead>Storage</TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("version")}
          >
            Version <SortIcon column="version" />
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("createdAt")}
          >
            Created <SortIcon column="createdAt" />
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAvatars.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
              No assets found.
            </TableCell>
          </TableRow>
        ) : (
          sortedAvatars.map((avatar) => {
            const status = getStatusLabel(avatar);

            return (
              <TableRow
                key={avatar.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                onClick={() => onSelectAsset?.(avatar)}
              >
                {/* Thumbnail */}
                <TableCell>
                  {avatar.thumbnailUrl ? (
                    <img
                      src={avatar.thumbnailUrl}
                      alt={avatar.name}
                      className="w-8 h-8 rounded object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-[9px]">
                      No img
                    </div>
                  )}
                </TableCell>

                {/* Name */}
                <TableCell>
                  <span className="font-semibold text-gray-900">
                    {avatar.name}
                  </span>
                  <code className="block text-[10px] text-gray-400 font-mono truncate max-w-[180px]">
                    {avatar.id}
                  </code>
                </TableCell>

                {/* Format */}
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {avatar.format?.toUpperCase() || "\u2014"}
                  </Badge>
                </TableCell>

                {/* Size */}
                <TableCell className="text-sm text-gray-600">
                  {formatFileSize(avatar.file_size_bytes)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getStatusBadgeClasses(status)}`}
                  >
                    {status}
                  </Badge>
                </TableCell>

                {/* Storage */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {avatar.storage?.r2 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0" title="Stored on Cloudflare R2 CDN">
                        R2
                      </Badge>
                    )}
                    {avatar.storage?.github_raw && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0" title="Stored on GitHub">
                        GH
                      </Badge>
                    )}
                    {!avatar.storage && avatar.modelFileUrl?.includes("raw.githubusercontent") && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0" title="Stored on GitHub">
                        GH
                      </Badge>
                    )}
                    {avatar.storage?.ipfs_cid && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                        IPFS
                      </Badge>
                    )}
                    {avatar.storage?.arweave_tx && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                        AR
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Version */}
                <TableCell className="text-sm text-gray-600">
                  {avatar.version ? `v${avatar.version}` : "\u2014"}
                </TableCell>

                {/* Created */}
                <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(avatar.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onToggleVisibility(avatar.id)}
                      title={avatar.isPublic ? "Hide from gallery" : "Show in gallery"}
                    >
                      {avatar.isPublic ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onDelete(avatar.id)}
                      title="Delete asset"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
