'use client';
import { Changelog } from '@/components/admin/Changelog';
export default function UpdatesPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Updates</h1>
      <Changelog />
    </div>
  );
}
