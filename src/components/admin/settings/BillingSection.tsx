'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Check, Zap, Building2, Crown, DollarSign, Receipt, Info, Tag } from 'lucide-react';

type PlanId = 'explorer' | 'creator' | 'studio';
type BillingTab = 'overview' | 'invoices';

interface Plan {
  id: PlanId;
  icon: typeof Zap;
  spaces: number;
  maxUsers: number;
  aiTokens: string;
  storage: string;
  price: string;
  monthly: number;
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
    monthly: 0,
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
    price: '€19/mo',
    monthly: 19,
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
    price: '€99/mo',
    monthly: 99,
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

const CREDIT_AMOUNTS = [25, 100, 500, 1000];

export function BillingSection() {
  const { t } = useI18n();
  const [currentPlan] = useState<PlanId>('explorer');
  const [tab, setTab] = useState<BillingTab>('overview');
  const [selectedCredit, setSelectedCredit] = useState(25);
  const [customCredit, setCustomCredit] = useState('');
  const creditAmount = customCredit ? Number(customCredit) : selectedCredit;

  return (
    <section id="settings-billing">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('admin.settings.billing.title')}
      </h2>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 mb-6">
        {(['overview', 'invoices'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-2.5 text-sm font-medium transition-colors relative ${
              tab === id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {id === 'overview' ? t('admin.settings.billing.overview') : t('admin.settings.billing.invoicesTab')}
            {tab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                {currentPlan} {t('admin.settings.billing.plan')}
              </span>
            </div>
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <Info className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.settings.billing.freeUsageNote')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t('admin.settings.billing.upgradeHint')}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <button className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                {t('admin.settings.billing.selectPlan')}
              </button>
            </div>
          </div>

          {/* Credit Balance */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('admin.settings.billing.creditBalance')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('admin.settings.billing.creditDescription')}
            </p>

            {/* Current balance */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 mb-5">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('admin.settings.billing.currentBalance')}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">€0.00</span>
            </div>

            {/* Credits */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {t('admin.settings.billing.credits')}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('admin.settings.billing.creditsDescription')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Amount selection */}
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {t('admin.settings.billing.selectAmount')}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {CREDIT_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => { setSelectedCredit(amount); setCustomCredit(''); }}
                        className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                          selectedCredit === amount && !customCredit
                            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        €{amount}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('admin.settings.billing.customAmount')}
                  </div>
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customCredit}
                    onChange={(e) => setCustomCredit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent"
                  />
                </div>

                {/* Summary */}
                <div className="sm:w-48 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                    {t('admin.settings.billing.summary')}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin.settings.billing.addedCredits')}</span>
                      <span className="text-gray-900 dark:text-white font-medium">€{creditAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin.settings.billing.newBalance')}</span>
                      <span className="text-gray-900 dark:text-white font-medium">€{creditAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <button className="w-full mt-3 px-3 py-2 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                    {t('admin.settings.billing.buyCredits')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coupons */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('admin.settings.billing.coupons')}
              </span>
            </div>
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('admin.settings.billing.noCoupons')}
              </p>
            </div>
          </div>

          {/* Plans */}
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('admin.settings.billing.availablePlans')}
            </div>
            <div className="space-y-3">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = plan.id === currentPlan;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isCurrent
                        ? 'border-gray-900 dark:border-white'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Icon className={`h-4 w-4 ${isCurrent ? 'text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'}`} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{plan.id}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {plan.monthly === 0 ? t('admin.settings.billing.free') : plan.price}
                          </span>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900">
                          {t('admin.settings.billing.current')}
                        </span>
                      ) : (
                        <button className="px-3 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          {t('admin.settings.billing.select')}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Invoices Tab */
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('admin.settings.billing.invoiceHistory')}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('admin.settings.billing.invoiceDescription')}
              </p>
            </div>
          </div>
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {t('admin.settings.billing.noInvoices')}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('admin.settings.billing.noInvoicesHint')}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
