import type { WorkflowRepository } from './WorkflowRepository'
import type { PersistedWorkflow, WorkflowSummary, WorkflowRunDetail, WorkflowRunLog, WorkflowRunSummary } from '../../types/persistence'
import { getHttpRepository } from './HttpWorkflowRepository'

const STORAGE_KEY = 'sequence-flow.workflows.v1'
const RUNS_KEY = 'sequence-flow.runs.v1'

type StoredRun = WorkflowRunDetail & { workflowId: string }

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

function readRuns(): StoredRun[] {
	try {
		const raw = localStorage.getItem(RUNS_KEY)
		if (!raw) return []
		const arr = JSON.parse(raw)
		if (!Array.isArray(arr)) return []
		return arr
	} catch {
		return []
	}
}

function writeRuns(runs: StoredRun[]) {
	localStorage.setItem(RUNS_KEY, JSON.stringify(runs))
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

	async execute(id: string, input?: Record<string, unknown>): Promise<{ runId: string; logs: WorkflowRunLog[] }> {
		const wf = await this.get(id)
		if (!wf) throw new Error('Workflow not found')
		const runId = crypto.randomUUID()
		const startedAt = Date.now()
		// Simple local run log: record a system entry and node-output entries from the FE runner
		const { executeWorkflow } = await import('../workflow/runner')
		const result = executeWorkflow(wf, input)
		const logs: WorkflowRunLog[] = [
			{ id: crypto.randomUUID(), type: 'system', message: 'Run started', timestamp: startedAt },
			...result.logs.map(l => ({ id: crypto.randomUUID(), type: 'node-output' as const, nodePersistedId: l.nodeId, message: l.content, data: { name: l.name, kind: l.kind }, timestamp: Date.now() })),
		]
		const detail: StoredRun = { workflowId: id, id: runId, status: 'succeeded', startedAt, finishedAt: Date.now(), logs }
		const allRuns = readRuns()
		allRuns.unshift(detail)
		writeRuns(allRuns)
		return { runId, logs }
	}

	async listRuns(id: string): Promise<WorkflowRunSummary[]> {
		return readRuns().filter(r => r.workflowId === id).map(r => ({ id: r.id, status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt }))
	}

	async getRun(id: string, runId: string): Promise<WorkflowRunDetail> {
		const run = readRuns().find(r => r.workflowId === id && r.id === runId)
		if (!run) throw new Error('Run not found')
		const { workflowId, ...rest } = run
		return rest
	}

	// New async methods for compatibility
	async executeAsync(id: string, input?: Record<string, unknown>): Promise<{ runId: string }> {
		// For local storage, we'll execute immediately and return the runId
		const result = await this.execute(id, input)
		return { runId: result.runId }
	}

	async getRunStatus(workflowId: string, runId: string): Promise<{
		status: string
		startedAt: string
		finishedAt?: string | null
		tasks: Array<{
			id: string
			nodeId: string
			nodeType: string
			status: string
			startedAt?: string | null
			completedAt?: string | null
			error?: string | null
		}>
		logs: Array<{
			id: string
			type: string
			message: string
			timestamp: string
			nodeId?: string | null
		}>
	}> {
		const run = readRuns().find(r => r.workflowId === workflowId && r.id === runId)
		if (!run) throw new Error('Run not found')
		
		return {
			status: run.status,
			startedAt: new Date(run.startedAt).toISOString(),
			finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
			tasks: [], // Local storage doesn't track individual tasks
			logs: run.logs.map(log => ({
				id: log.id,
				type: log.type,
				message: log.message,
				timestamp: new Date(log.timestamp).toISOString(),
				nodeId: log.nodePersistedId || null
			}))
		}
	}
}

export function getDefaultRepository(): WorkflowRepository {
	const base = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || (globalThis as any)?.SEQUENCE_BE_BASE_URL
	if (base) return getHttpRepository()
	return new LocalStorageWorkflowRepository()
} 