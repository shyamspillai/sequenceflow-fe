import type { WorkflowRepository } from './WorkflowRepository'
import type { PersistedWorkflow, WorkflowSummary } from '../../types/persistence'

const STORAGE_KEY = 'sequence-flow.workflows.v1'

function readAll(): PersistedWorkflow[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return []
		const arr = JSON.parse(raw)
		if (!Array.isArray(arr)) return []
		return arr
	} catch {
		return []
	}
}

function writeAll(items: PersistedWorkflow[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export class LocalStorageWorkflowRepository implements WorkflowRepository {
	async list(): Promise<WorkflowSummary[]> {
		const all = readAll()
		return all
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
	}

	async get(id: string): Promise<PersistedWorkflow | null> {
		const all = readAll()
		return all.find(w => w.id === id) ?? null
	}

	async create(input: { name: string; workflow: Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> }): Promise<PersistedWorkflow> {
		const now = Date.now()
		const created: PersistedWorkflow = {
			id: crypto.randomUUID(),
			name: input.name,
			nodes: input.workflow.nodes,
			edges: input.workflow.edges,
			createdAt: now,
			updatedAt: now,
		}
		const all = readAll()
		all.push(created)
		writeAll(all)
		return created
	}

	async update(workflow: PersistedWorkflow): Promise<PersistedWorkflow> {
		const all = readAll()
		const idx = all.findIndex(w => w.id === workflow.id)
		const updated: PersistedWorkflow = { ...workflow, updatedAt: Date.now() }
		if (idx >= 0) all[idx] = updated
		else all.push(updated)
		writeAll(all)
		return updated
	}

	async delete(id: string): Promise<void> {
		const all = readAll().filter(w => w.id !== id)
		writeAll(all)
	}
}

export function getDefaultRepository(): WorkflowRepository {
	return new LocalStorageWorkflowRepository()
} 