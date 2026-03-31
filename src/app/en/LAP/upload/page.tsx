'use client';

import { useRouter } from 'next/navigation';
import { AssetUpload } from '@/components/admin/AssetUpload';

export default function UploadPage() {
  const router = useRouter();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload Asset</h1>
      <AssetUpload onUploaded={() => router.push('/en/LAP/assets')} />
    </div>
  );
}
