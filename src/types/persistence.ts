export type PersistedEdge = {
	id: string
	sourceId: string
	targetId: string
	sourceHandleId?: string
	targetHandleId?: string
}

export type PersistedNodePosition = { x: number; y: number }

export type PersistedNodeBase = import('./workflow').WorkflowNode

export type PersistedNode = {
	id: string
	base: PersistedNodeBase
	position: PersistedNodePosition
}

export type PersistedWorkflow = {
	id: string
	name: string
	nodes: PersistedNode[]
	edges: PersistedEdge[]
	createdAt: number
	updatedAt: number
}

export type WorkflowSummary = {
	id: string
	name: string
	updatedAt: number
}

export type WorkflowRunSummary = {
	id: string
	status: 'queued' | 'running' | 'succeeded' | 'failed'
	startedAt: number
	finishedAt?: number
}

export type WorkflowRunLog = {
	id: string
	type: 'info' | 'error' | 'node-output' | 'system'
	nodePersistedId?: string
	message: string
	data?: Record<string, unknown>
	timestamp: number
}

export type WorkflowRunDetail = WorkflowRunSummary & { logs: WorkflowRunLog[] } 