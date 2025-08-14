import type { PersistedWorkflow, WorkflowSummary, WorkflowRunSummary, WorkflowRunDetail, WorkflowRunLog } from '../../types/persistence'

export interface WorkflowRepository {
	list(): Promise<WorkflowSummary[]>
	get(id: string): Promise<PersistedWorkflow | null>
	create(input: { name: string; workflow: Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> }): Promise<PersistedWorkflow>
	update(workflow: PersistedWorkflow): Promise<PersistedWorkflow>
	delete(id: string): Promise<void>

	execute(id: string, input?: Record<string, unknown>): Promise<{ runId: string; logs: WorkflowRunLog[] }>
	listRuns(id: string): Promise<WorkflowRunSummary[]>
	getRun(id: string, runId: string): Promise<WorkflowRunDetail>
} 