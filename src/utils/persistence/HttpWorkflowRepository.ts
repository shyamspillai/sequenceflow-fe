import type { WorkflowRepository } from './WorkflowRepository'
import type { PersistedWorkflow, WorkflowSummary, WorkflowRunLog, WorkflowRunSummary, WorkflowRunDetail } from '../../types/persistence'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
	const base = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (window as any)?.SEQUENCE_BE_BASE_URL || ''
	const url = `${String(base).replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
	const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	return (await res.json()) as T
}

export class HttpWorkflowRepository implements WorkflowRepository {
	async list(): Promise<WorkflowSummary[]> {
		return http<WorkflowSummary[]>('/workflows')
	}

	async get(id: string): Promise<PersistedWorkflow | null> {
		try {
			return await http<PersistedWorkflow>(`/workflows/${encodeURIComponent(id)}`)
		} catch (e: any) {
			if (String(e?.message || '').includes('HTTP 404')) return null
			throw e
		}
	}

	async create(input: { name: string; workflow: Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> }): Promise<PersistedWorkflow> {
		// Backend CreateWorkflowInputDto expects only nodes and edges inside workflow
		const payload = {
			name: input.name,
			workflow: {
				nodes: input.workflow.nodes,
				edges: input.workflow.edges,
			},
		}
		return http<PersistedWorkflow>('/workflows', { method: 'POST', body: JSON.stringify(payload) })
	}

	async update(workflow: PersistedWorkflow): Promise<PersistedWorkflow> {
		return http<PersistedWorkflow>(`/workflows/${encodeURIComponent(workflow.id)}`, { method: 'PUT', body: JSON.stringify(workflow) })
	}

	async delete(id: string): Promise<void> {
		await http<void>(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' })
	}

	async execute(id: string, input?: Record<string, unknown>): Promise<{ runId: string; logs: WorkflowRunLog[] }> {
		return http<{ runId: string; logs: WorkflowRunLog[] }>(`/workflows/${encodeURIComponent(id)}/execute`, { method: 'POST', body: JSON.stringify({ input }) })
	}

	async listRuns(id: string): Promise<WorkflowRunSummary[]> {
		return http<WorkflowRunSummary[]>(`/workflows/${encodeURIComponent(id)}/runs`)
	}

	async getRun(id: string, runId: string): Promise<WorkflowRunDetail> {
		return http<WorkflowRunDetail>(`/workflows/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}`)
	}
}

export function getHttpRepository(): WorkflowRepository {
	return new HttpWorkflowRepository()
} 