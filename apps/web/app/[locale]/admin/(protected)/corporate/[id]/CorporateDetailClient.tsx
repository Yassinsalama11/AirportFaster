'use client';

import { useState, FormEvent } from 'react';
import { API_URL } from '@/lib/api-client';

interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface CorporateBooking {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
}

interface CorporateDetail {
  id: string;
  companyName: string;
  legalName: string | null;
  vatNumber: string | null;
  billingEmail: string | null;
  creditLimitMinor: number | null;
  currency: string;
  paymentTermsDays: number | null;
  status: string;
  createdAt: string;
  members?: Member[];
  bookings?: CorporateBooking[];
}

interface Props {
  corporate: CorporateDetail;
  activeTab: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  suspended: 'bg-red-500/20 text-red-400 border border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  completed: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  paid: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  pending_payment: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function CorporateDetailClient({ corporate, activeTab }: Props) {
  // Overview tab state
  const [companyName, setCompanyName] = useState(corporate.companyName);
  const [legalName, setLegalName] = useState(corporate.legalName ?? '');
  const [vatNumber, setVatNumber] = useState(corporate.vatNumber ?? '');
  const [billingEmail, setBillingEmail] = useState(corporate.billingEmail ?? '');
  const [creditLimit, setCreditLimit] = useState(
    corporate.creditLimitMinor !== null ? String(corporate.creditLimitMinor / 100) : '',
  );
  const [paymentTerms, setPaymentTerms] = useState(String(corporate.paymentTermsDays ?? 30));
  const [status, setStatus] = useState(corporate.status);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Members tab state
  const [members, setMembers] = useState<Member[]>(corporate.members ?? []);
  const [addEmail, setAddEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleSaveOverview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/corporate/${corporate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName,
          legalName: legalName || undefined,
          vatNumber: vatNumber || undefined,
          billingEmail: billingEmail || undefined,
          creditLimitMinor: creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined,
          paymentTermsDays: parseInt(paymentTerms, 10),
          status,
        }),
      });

      const data = (await response.json()) as { success: boolean; error?: { message: string } };

      if (!response.ok || !data.success) {
        setSaveError(data.error?.message ?? 'Failed to save changes.');
        return;
      }

      setSaveSuccess(true);
    } catch {
      setSaveError('A network error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/corporate/${corporate.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: addEmail }),
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { member: Member };
        error?: { message: string };
      };

      if (!response.ok || !data.success) {
        setAddError(data.error?.message ?? 'Failed to add member.');
        return;
      }

      if (data.data?.member) {
        setMembers((prev) => [...prev, data.data!.member]);
      }
      setAddEmail('');
    } catch {
      setAddError('A network error occurred. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      const response = await fetch(`${API_URL}/api/admin/corporate/${corporate.id}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = (await response.json()) as { success: boolean };

      if (response.ok && data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // ignore
    }
  }

  if (activeTab === 'overview') {
    return (
      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <form onSubmit={handleSaveOverview} className="space-y-5 max-w-2xl">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Legal Name
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              VAT Number
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Billing Email
            </label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Credit Limit (EUR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Payment Terms (days)
              </label>
              <input
                type="number"
                min="0"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {saveError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400 text-sm">{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-green-400 text-sm">Changes saved successfully</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Meta */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-gray-500">
            Account ID: <span className="font-mono text-gray-400">{corporate.id}</span>
            <span className="mx-2">·</span>
            Created: {new Date(corporate.createdAt).toLocaleDateString('en-GB')}
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[corporate.status] ?? 'bg-gray-500/20 text-gray-400'}`}
            >
              {corporate.status}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'members') {
    return (
      <div className="space-y-4">
        {/* Add member */}
        <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-brand-white mb-4">Add Member by Email</h2>
          <form onSubmit={handleAddMember} className="flex gap-3">
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="member@company.com"
              className="flex-1 px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2.5 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </form>
          {addError && (
            <p className="text-red-400 text-sm mt-2">{addError}</p>
          )}
        </div>

        {/* Members list */}
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {members.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No members yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-sm text-brand-white">
                      {member.firstName || member.lastName
                        ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{member.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-400 capitalize">
                      {member.role.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Bookings tab
  const bookings = corporate.bookings ?? [];
  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
      {bookings.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">No bookings found.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Reference
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-brand-gold font-bold">
                    {booking.reference}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400">
                  {new Date(booking.serviceDateTime).toLocaleDateString('en-GB')}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${BOOKING_STATUS_BADGE[booking.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                  >
                    {booking.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-brand-white font-medium">
                  {formatAmount(booking.totalMinor, booking.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
