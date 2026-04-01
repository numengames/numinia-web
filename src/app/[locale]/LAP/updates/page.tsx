'use client';

import { Changelog } from '@/components/admin/Changelog';
import { useI18n } from '@/lib/i18n';

export default function UpdatesPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('admin.updates.title')}</h1>
      <Changelog />
    </div>
  );
}
