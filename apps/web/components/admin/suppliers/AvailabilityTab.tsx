'use client';

import { useEffect, useState } from 'react';

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isAvailable: boolean;
}

const ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const LABEL: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_SCHEDULE: DaySchedule[] = ORDER.map((d) => ({
  dayOfWeek: d,
  openTime: '08:00',
  closeTime: '22:00',
  isAvailable: true,
}));

export function AvailabilityTab({ supplierId }: { supplierId: string }) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/suppliers/${supplierId}/availability`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success) {
          setSchedule(json.data.schedule);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  function updateDay(day: DayOfWeek, patch: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)),
    );
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error?.message ?? 'Failed to save availability');
        return;
      }
      setSchedule(json.data.schedule);
      showToast('success', 'Availability saved');
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading availability…</p>;
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`px-3 py-2 rounded text-xs ${
            toast.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Day</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Available</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Open</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Close</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ORDER.map((day) => {
              const row = schedule.find((d) => d.dayOfWeek === day) ?? DEFAULT_SCHEDULE.find((d) => d.dayOfWeek === day)!;
              return (
                <tr key={day} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-brand-white">{LABEL[day]}</td>
                  <td className="px-5 py-3 text-sm">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={(e) => updateDay(day, { isAvailable: e.target.checked })}
                        className="accent-brand-gold"
                      />
                    </label>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="time"
                      value={row.openTime}
                      onChange={(e) => updateDay(day, { openTime: e.target.value })}
                      disabled={!row.isAvailable}
                      className="px-2 py-1 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="time"
                      value={row.closeTime}
                      onChange={(e) => updateDay(day, { closeTime: e.target.value })}
                      disabled={!row.isAvailable}
                      className="px-2 py-1 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg text-sm hover:bg-brand-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Availability'}
        </button>
        <p className="text-xs text-gray-500">
          Hours are local to the supplier's home country. Use 24-hour HH:MM format.
        </p>
      </div>
    </div>
  );
}
