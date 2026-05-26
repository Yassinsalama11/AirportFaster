'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// (Admin requests now go through the Next.js /api/admin proxy that forwards the session cookie)

interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
}

interface Props {
  supplierId: string;
  contacts: Contact[];
}

export function ContactsTab({ supplierId, contacts }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, string | boolean | undefined> = { name: name.trim() };
    if (role.trim()) body['role'] = role.trim();
    if (email.trim()) body['email'] = email.trim();
    if (phone.trim()) body['phone'] = phone.trim();
    if (whatsapp.trim()) body['whatsapp'] = whatsapp.trim();
    body['isPrimary'] = isPrimary;

    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to add contact');
        return;
      }
      setName('');
      setRole('');
      setEmail('');
      setPhone('');
      setWhatsapp('');
      setIsPrimary(false);
      setShowForm(false);
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(contactId: string) {
    if (!confirm('Remove this contact?')) return;
    try {
      await fetch(`/api/admin/suppliers/${supplierId}/contacts/${contactId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      router.refresh();
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      {contacts.length === 0 ? (
        <p className="text-gray-500 text-sm">No contacts yet.</p>
      ) : (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-brand-white">
                    {c.name}
                    {c.isPrimary && (
                      <span className="ml-2 text-xs bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">{c.role ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{c.email ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-brand-gold hover:underline"
        >
          + Add Contact
        </button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="bg-brand-navy border border-white/10 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-brand-white">Add Contact</h3>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Account Manager"
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input
                id="isPrimary"
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="accent-brand-gold"
              />
              <label htmlFor="isPrimary" className="text-sm text-gray-300 cursor-pointer">
                Primary contact
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-brand-gold text-brand-black font-semibold rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-white/10 text-gray-400 rounded text-sm hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
