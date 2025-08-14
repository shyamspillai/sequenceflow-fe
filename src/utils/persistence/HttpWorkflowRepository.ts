import type { WorkflowRepository } from './WorkflowRepository'
import type { PersistedWorkflow, WorkflowSummary } from '../../types/persistence'

function getBaseUrl(): string {
	const vite = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL as string | undefined
	const globalVar = (globalThis as any)?.SEQUENCE_BE_BASE_URL as string | undefined
	return (vite || globalVar || 'http://localhost:3001').replace(/\/$/, '')
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${getBaseUrl()}${path}`, {
		...init,
		headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
		credentials: 'include',
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
	}
	if (res.status === 204) return undefined as unknown as T
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
}

export function getHttpRepository(): WorkflowRepository {
	return new HttpWorkflowRepository()
} 