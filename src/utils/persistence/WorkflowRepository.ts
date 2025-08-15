import type { PersistedWorkflow, WorkflowSummary, WorkflowRunSummary, WorkflowRunDetail, WorkflowRunLog } from '../../types/persistence'

export interface WorkflowRepository {
	list(): Promise<WorkflowSummary[]>
	get(id: string): Promise<PersistedWorkflow | null>
	create(input: { name: string; workflow: Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> }): Promise<PersistedWorkflow>
	update(workflow: PersistedWorkflow): Promise<PersistedWorkflow>
	delete(id: string): Promise<void>

	execute(id: string, input?: Record<string, unknown>): Promise<{ runId: string; logs: WorkflowRunLog[] }>
	executeAsync?(id: string, input?: Record<string, unknown>): Promise<{ runId: string }>
	getRunStatus?(workflowId: string, runId: string): Promise<{
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
	}>
	listRuns(id: string): Promise<WorkflowRunSummary[]>
	getRun(id: string, runId: string): Promise<WorkflowRunDetail>
} 