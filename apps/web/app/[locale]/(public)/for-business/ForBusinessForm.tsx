'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackGenerateLead } from '@/lib/analytics';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface FormState { name: string; company: string; email: string; message: string; }
interface SubmitState { status: 'idle' | 'submitting' | 'success' | 'error'; errorMessage?: string; }

export function ForBusinessForm() {
  const t = useTranslations('for_business');
  const [form, setForm] = useState<FormState>({ name: '', company: '', email: '', message: '' });
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmit({ status: 'submitting' });
    try {
      const res = await fetch(`${API_BASE}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Request failed');
      trackGenerateLead('business');
      setSubmit({ status: 'success' });
      setForm({ name: '', company: '', email: '', message: '' });
    } catch {
      setSubmit({ status: 'error', errorMessage: t('form_error') });
    }
  }

  if (submit.status === 'success') {
    return (
      <div className="bg-surface border border-brand-gold/30 rounded-2xl p-8 text-center shadow-card">
        <p className="text-brand-gold-dark text-2xl font-bold mb-2">{t('form_success_title')}</p>
        <p className="text-ink-2">{t('form_success_body')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField id="name" name="name" type="text" required value={form.name} onChange={handleChange}
        label={t('form_name_label')} placeholder={t('form_name_placeholder')} />
      <FormField id="company" name="company" type="text" required value={form.company} onChange={handleChange}
        label={t('form_company_label')} placeholder={t('form_company_placeholder')} />
      <FormField id="email" name="email" type="email" required value={form.email} onChange={handleChange}
        label={t('form_email_label')} placeholder={t('form_email_placeholder')} dir="ltr" />
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-ink-2 mb-2">{t('form_message_label')}</label>
        <textarea
          id="message" name="message" required rows={5} value={form.message} onChange={handleChange}
          placeholder={t('form_message_placeholder')}
          className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-ink placeholder-ink-3 focus:outline-none focus:border-brand-gold transition-colors resize-none"
        />
      </div>
      {submit.status === 'error' && submit.errorMessage && (
        <p className="text-red-600 text-sm">{submit.errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={submit.status === 'submitting'}
        className="w-full py-3.5 bg-brand-gold text-brand-black font-bold rounded-full hover:bg-brand-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submit.status === 'submitting' ? t('form_submitting') : t('form_submit')}
      </button>
    </form>
  );
}

function FormField(props: {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  placeholder: string;
  dir?: string;
}) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-semibold text-ink-2 mb-2">{props.label}</label>
      <input
        id={props.id}
        name={props.name}
        type={props.type}
        required={props.required}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        {...(props.dir && { dir: props.dir })}
        className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-ink placeholder-ink-3 focus:outline-none focus:border-brand-gold transition-colors"
      />
    </div>
  );
}
