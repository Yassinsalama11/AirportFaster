import { getTranslations } from 'next-intl/server';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SuspenseBoundary } from '@/components/SuspenseBoundary';
import { LoginForm } from './LoginForm';

export async function generateMetadata() {
  const t = await getTranslations('admin_login');
  return { title: t('meta_title') };
}

export default async function LoginPage() {
  const t = await getTranslations('admin_login');
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/30 via-brand-black to-brand-black pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <BrandLogo href="/" className="justify-center" markClassName="h-12 w-[250px]" />
          <p className="mt-2 text-sm text-gray-500 tracking-widest uppercase">
            {t('staff_portal')}
          </p>
        </div>

        <div className="bg-brand-navy border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-brand-white mb-1">{t('welcome_back')}</h2>
          <p className="text-sm text-gray-400 mb-8">{t('sign_in_subtitle')}</p>

          <SuspenseBoundary fallback={null}>
            <LoginForm
              labels={{
                emailLabel: t('email_label'),
                emailPlaceholder: t('email_placeholder'),
                passwordLabel: t('password_label'),
                passwordPlaceholder: t('password_placeholder'),
                submitBtn: t('submit_btn'),
                submitLoadingBtn: t('submit_loading_btn'),
                errorFailed: t('error_failed'),
                errorNetwork: t('error_network'),
              }}
            />
          </SuspenseBoundary>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">{t('restricted_note')}</p>
      </div>
    </div>
  );
}
