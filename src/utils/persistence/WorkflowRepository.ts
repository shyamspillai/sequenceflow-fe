import type { PersistedWorkflow, WorkflowSummary } from '../../types/persistence'

export interface WorkflowRepository {
	list(): Promise<WorkflowSummary[]>
	get(id: string): Promise<PersistedWorkflow | null>
	create(input: { name: string; workflow: Omit<PersistedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'name'> }): Promise<PersistedWorkflow>
	update(workflow: PersistedWorkflow): Promise<PersistedWorkflow>
	delete(id: string): Promise<void>
} 