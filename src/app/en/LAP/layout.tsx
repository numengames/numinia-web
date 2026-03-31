'use client';

import { LAPShell } from '@/components/admin/LAPShell';

export default function LAPLayout({ children }: { children: React.ReactNode }) {
  return <LAPShell>{children}</LAPShell>;
}
