'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Check, Zap, Building2, Crown } from 'lucide-react';

type PlanId = 'explorer' | 'creator' | 'studio';

interface Plan {
  id: PlanId;
  icon: typeof Zap;
  spaces: number;
  maxUsers: number;
  aiTokens: string;
  storage: string;
  price: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'explorer',
    icon: Zap,
    spaces: 1,
    maxUsers: 10,
    aiTokens: '10K/mo',
    storage: '1 GB',
    price: 'Free',
    features: [
      '1 world space',
      'Up to 10 concurrent users',
      '10K AI tokens/month',
      '1 GB asset library',
      'Community support',
    ],
  },
  {
    id: 'creator',
    icon: Building2,
    spaces: 5,
    maxUsers: 50,
    aiTokens: '100K/mo',
    storage: '10 GB',
    price: '19/mo',
    features: [
      '5 world spaces',
      'Up to 50 concurrent users',
      '100K AI tokens/month',
      '10 GB asset library',
      'Custom domain',
      'Priority support',
    ],
  },
  {
    id: 'studio',
    icon: Crown,
    spaces: -1,
    maxUsers: 500,
    aiTokens: '1M/mo',
    storage: '100 GB',
    price: '99/mo',
    features: [
      'Unlimited world spaces',
      'Up to 500 concurrent users',
      '1M AI tokens/month',
      '100 GB asset library',
      'Custom domain + branding',
      'Team accounts',
      'Dedicated support',
      'API access',
    ],
  },
];

export function BillingSection() {
  const { t } = useI18n();
  const [currentPlan] = useState<PlanId>('explorer');

  return (
    <section id="settings-billing">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {t('admin.settings.billing.title')}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
        {t('admin.settings.billing.description')}
      </p>

      {/* Current plan banner */}
      <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.settings.billing.currentPlan')}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">{currentPlan}</div>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t('admin.settings.billing.active')}
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;

          return (
            <div
              key={plan.id}
              className={`rounded-lg border p-5 transition-colors ${
                isCurrent
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800/50'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isCurrent ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Icon className={`h-5 w-5 ${isCurrent ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white capitalize">{plan.id}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.price === 'Free' ? t('admin.settings.billing.free') : `€${plan.price}`}
                    </div>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900">
                    {t('admin.settings.billing.current')}
                  </span>
                ) : (
                  <button className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {t('admin.settings.billing.select')}
                  </button>
                )}
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Specs grid */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { label: t('admin.settings.billing.spaces'), value: plan.spaces === -1 ? '∞' : String(plan.spaces) },
                  { label: t('admin.settings.billing.users'), value: String(plan.maxUsers) },
                  { label: t('admin.settings.billing.aiTokens'), value: plan.aiTokens },
                  { label: t('admin.settings.billing.storageLabel'), value: plan.storage },
                ].map((spec) => (
                  <div key={String(spec.label)} className="text-center">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{spec.value}</div>
                    <div className="text-[10px] text-gray-400">{spec.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
