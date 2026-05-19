'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api-client';

export default function NewIncidentPage() {
  const router = useRouter();

  const [bookingId, setBookingId] = useState('');
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, string> = { type, severity, description };
      if (bookingId.trim()) body['bookingId'] = bookingId.trim();

      const res = await fetch(`${API_URL}/api/admin/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        success: boolean;
        data?: { incident: { id: string } };
        error?: { message: string };
      };

      if (!data.success || !data.data) {
        setError(data.error?.message ?? 'Failed to create incident. Please try again.');
        return;
      }

      router.push(`/admin/incidents/${data.data.incident.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/incidents" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
          Incidents
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-brand-white text-sm">Report Incident</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-white">Report Incident</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Document an operational issue. The description becomes the initial incident log entry.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-brand-navy border border-white/5 rounded-xl p-6 space-y-5">
        {/* Booking ID */}
        <div>
          <label htmlFor="bookingId" className="block text-sm font-medium text-gray-300 mb-1.5">
            Booking ID / Reference{' '}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="bookingId"
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="UUID or booking reference"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
          />
          <p className="text-xs text-gray-600 mt-1">Enter the booking UUID as shown in the admin dashboard.</p>
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1.5">
            Incident Type <span className="text-red-400">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
          >
            <option value="">Select type…</option>
            <option value="flight_delay">Flight Delay</option>
            <option value="supplier_no_show">Supplier No-Show</option>
            <option value="passenger_no_show">Passenger No-Show</option>
            <option value="wrong_terminal">Wrong Terminal</option>
            <option value="communication_failure">Communication Failure</option>
            <option value="payment_issue">Payment Issue</option>
            <option value="service_complaint">Service Complaint</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-300 mb-1.5">
            Severity <span className="text-red-400">*</span>
          </label>
          <select
            id="severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
            minLength={1}
            maxLength={5000}
            placeholder="Describe what happened in detail…"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-gold/50 transition-colors resize-y"
          />
          <p className="text-xs text-gray-600 mt-1">{description.length}/5000</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-brand-gold text-brand-black text-sm font-bold rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Reporting…' : 'Report Incident'}
          </button>
          <Link
            href="/admin/incidents"
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-brand-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
