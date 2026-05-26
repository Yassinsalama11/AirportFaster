import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';
import { IncidentActionsPanel } from '@/components/admin/incidents/IncidentActionsPanel';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await adminApiCall<{ incident: IncidentRecord }>(`/api/admin/incidents/${id}`);
  const typeLabel = response.success ? response.data.incident.type.replace(/_/g, ' ') : 'Incident';
  return { title: `Incident: ${typeLabel}` };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface IncidentUpdate {
  id: string;
  body: string;
  authorUserId: string | null;
  createdAt: string;
}

interface IncidentAssignment {
  id: string;
  assignedToUserId: string | null;
  assignedTeam: string | null;
  assignedAt: string;
}

interface IncidentRecord {
  id: string;
  type: string;
  severity: string;
  status: string;
  bookingId: string | null;
  supplierId: string | null;
  openedBy: string | null;
  resolutionReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updates: IncidentUpdate[];
  assignments: IncidentAssignment[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const RESOLVABLE_STATUSES = new Set(['created', 'assigned', 'in_progress', 'waiting_external']);

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const response = await adminApiCall<{ incident: IncidentRecord }>(`/api/admin/incidents/${id}`);

  if (!response.success) {
    notFound();
  }

  const incident = response.data.incident;
  const canResolve = RESOLVABLE_STATUSES.has(incident.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/incidents"
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          Incidents
        </Link>
        <span className="text-gray-600">/</span>
        <span className="font-mono text-brand-gold text-sm">{id.slice(0, 8)}…</span>
        <span
          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[incident.severity] ?? ''}`}
        >
          {incident.severity}
        </span>
        <span
          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[incident.status] ?? ''}`}
        >
          {incident.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: timeline + updates */}
        <div className="col-span-2 space-y-5">
          {/* Header card */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
                <p className="text-xl font-bold text-brand-white capitalize">
                  {incident.type.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Opened {new Date(incident.createdAt).toLocaleString('en-GB')}</p>
                {incident.bookingId && (
                  <Link
                    href={`/admin/bookings/${incident.bookingId}`}
                    className="text-brand-gold hover:text-brand-gold/80 transition-colors mt-1 block"
                  >
                    View booking
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Updates timeline */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-5">Activity Timeline</p>

            {incident.updates.length === 0 ? (
              <p className="text-gray-500 text-sm">No updates yet.</p>
            ) : (
              <div className="relative space-y-0">
                {incident.updates.map((update, i) => (
                  <div key={update.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-gold border-2 border-brand-gold/40 mt-1 flex-shrink-0" />
                      {i < incident.updates.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 my-1 min-h-4" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(update.createdAt).toLocaleString('en-GB')}
                        {update.authorUserId && (
                          <span className="ml-2 text-gray-600">· {update.authorUserId.slice(0, 8)}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{update.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive panel (add update, assign, resolve) */}
          <IncidentActionsPanel incidentId={id} canResolve={canResolve} currentStatus={incident.status} />
        </div>

        {/* Right: sidebar details */}
        <div className="space-y-4">
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-sm space-y-3">
            <p className="text-gray-400 font-medium mb-2">Incident Details</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Severity</span>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[incident.severity] ?? ''}`}
              >
                {incident.severity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[incident.status] ?? ''}`}
              >
                {incident.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updates</span>
              <span className="text-brand-white">{incident.updates.length}</span>
            </div>
            {incident.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Resolved</span>
                <span className="text-green-400 text-xs">
                  {new Date(incident.resolvedAt).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
          </div>

          {incident.assignments.length > 0 && (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-sm space-y-2">
              <p className="text-gray-400 font-medium mb-2">Assignments</p>
              {incident.assignments.map((a) => (
                <div key={a.id} className="text-xs text-gray-400">
                  {a.assignedTeam ? (
                    <span className="capitalize">{a.assignedTeam.replace(/_/g, ' ')}</span>
                  ) : (
                    <span className="font-mono">{a.assignedToUserId?.slice(0, 8)}</span>
                  )}
                  <span className="text-gray-600 ml-2">
                    {new Date(a.assignedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {incident.resolutionReason && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 text-sm">
              <p className="text-green-400 font-medium mb-2">Resolution</p>
              <p className="text-gray-300 text-xs leading-relaxed">{incident.resolutionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
