import { adminApiCall } from '@/lib/admin-api';
import { AiQueueClient } from './AiQueueClient';

export const metadata = { title: 'AI Engine' };

interface Workflow {
  id: string;
  entityType: string;
  entityId: string;
  state: string;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowsResponse {
  workflows: Workflow[];
}

async function loadWorkflows(path: string): Promise<Workflow[]> {
  const res = await adminApiCall<WorkflowsResponse>(path);
  if (res.success && res.data) return res.data.workflows;
  return [];
}

export default async function AiEnginePage() {
  const [seoWorkflows, translationWorkflows] = await Promise.all([
    loadWorkflows('/api/admin/ai-seo/workflows'),
    loadWorkflows('/api/admin/ai-translation/workflows'),
  ]);

  // Filter SEO workflows to exclude translation_job entries (handled by separate tab)
  const filteredSeoWorkflows = seoWorkflows.filter(
    (w) => w.entityType !== 'translation_job',
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">AI Engine</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Review, edit, and approve AI-generated content before it goes live.
        </p>
      </div>

      <AiQueueClient
        seoWorkflows={filteredSeoWorkflows}
        translationWorkflows={translationWorkflows}
      />
    </div>
  );
}
