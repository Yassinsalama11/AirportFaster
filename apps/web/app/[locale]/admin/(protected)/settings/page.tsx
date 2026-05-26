import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';
import { SettingsForm } from '@/components/admin/settings/SettingsForm';

export const metadata = { title: 'Settings' };

async function loadSetting(key: string): Promise<Record<string, unknown>> {
  try {
    const res = await adminApiCall<{ settings: Record<string, unknown> }>(`/api/admin/settings/${key}`);
    return res.success ? res.data.settings : {};
  } catch {
    return {};
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? 'business';

  const [business, commerce, notifications, integrations] = await Promise.all([
    loadSetting('business'),
    loadSetting('commerce'),
    loadSetting('notifications'),
    loadSetting('integrations'),
  ]);

  const TABS = [
    { key: 'business', label: 'Business Info' },
    { key: 'commerce', label: 'Booking & Commerce' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'integrations', label: 'Integrations' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Platform configuration and integrations</p>
      </div>

      <div className="flex border-b border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <SettingsForm
        activeTab={activeTab}
        business={business}
        commerce={commerce}
        notifications={notifications}
        integrations={integrations}
      />
    </div>
  );
}
