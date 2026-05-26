import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Incidents' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface IncidentUpdate {
  id: string;
  body: string;
  createdAt: string;
}

interface IncidentAssignment {
  id: string;
  assignedTeam: string | null;
}

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: string;
  bookingId: string | null;
  createdAt: string;
  updates: IncidentUpdate[];
  assignments: IncidentAssignment[];
}

interface IncidentsData {
  items: Incident[];
  nextCursor: string | null;
}

// ── Badge maps ────────────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const STATUS_BADGE: Record<string, string> = {
  created: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  assigned: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  in_progress: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  waiting_external: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  resolved: 'bg-green-500/20 text-green-400 border border-green-500/30',
  closed: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
};

const TYPE_BADGE: Record<string, string> = {
  flight_delay: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  supplier_no_show: 'bg-red-500/20 text-red-400 border border-red-500/30',
  passenger_no_show: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  wrong_terminal: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  communication_failure: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  payment_issue: 'bg-red-500/20 text-red-400 border border-red-500/30',
  service_complaint: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  other: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.set('dateTo', params.dateTo);
  if (params.cursor) queryParams.set('cursor', params.cursor);
  queryParams.set('pageSize', '25');

  const response = await adminApiCall<IncidentsData>(
    `/api/admin/incidents?${queryParams.toString()}`,
  );

  const data = response.success ? response.data : null;
  const incidents = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const hasActiveFilters = !!(
    params.status ||
    params.severity ||
    params.dateFrom ||
    params.dateTo
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Incidents</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <Link
          href="/admin/incidents/new"
          className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-bold rounded-lg hover:bg-brand-gold/90 transition-colors"
        >
          Report Incident
        </Link>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_external">Waiting External</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          name="severity"
          defaultValue={params.severity ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          name="dateFrom"
          type="date"
          defaultValue={params.dateFrom ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
        <input
          name="dateTo"
          type="date"
          defaultValue={params.dateTo ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />

        <button
          type="submit"
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm hover:border-brand-gold transition-colors"
        >
          Filter
        </button>

        {hasActiveFilters && (
          <Link
            href="/admin/incidents"
            className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-gray-400 text-sm hover:border-white/30 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No incidents found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Booking Ref
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incidents.map((incident) => {
                const firstUpdate = incident.updates[0];
                const latestAssignment = incident.assignments[0];

                return (
                  <tr
                    key={incident.id}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-brand-white max-w-xs">
                      <span className="block truncate">
                        {firstUpdate
                          ? firstUpdate.body.length > 60
                            ? `${firstUpdate.body.slice(0, 60)}…`
                            : firstUpdate.body
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[incident.type] ?? 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {incident.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[incident.severity] ?? 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {incident.bookingId ? (
                        <Link
                          href={`/admin/bookings/${incident.bookingId}`}
                          className="font-mono text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[incident.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {incident.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {latestAssignment?.assignedTeam
                        ? latestAssignment.assignedTeam.replace(/_/g, ' ')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(incident.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/incidents/${incident.id}`}
                        className="text-sm text-brand-gold hover:text-brand-gold/80 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 text-sm">
        {nextCursor && (
          <Link
            href={`?${new URLSearchParams({
              ...(params.status ? { status: params.status } : {}),
              ...(params.severity ? { severity: params.severity } : {}),
              ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
              ...(params.dateTo ? { dateTo: params.dateTo } : {}),
              cursor: nextCursor,
            })}`}
            className="px-3 py-1 bg-brand-navy border border-white/10 rounded hover:border-brand-gold transition-colors text-gray-400"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
