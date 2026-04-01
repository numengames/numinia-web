'use client';

import { useRouter } from 'next/navigation';
import { AssetUpload } from '@/components/admin/AssetUpload';
import { useI18n } from '@/lib/i18n';

export default function UploadPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('admin.upload.title')}</h1>
      <AssetUpload onUploaded={() => router.push(`/${locale}/LAP/assets`)} />
    </div>
  );
}
