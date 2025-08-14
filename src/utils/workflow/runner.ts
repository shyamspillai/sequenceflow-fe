import type { PersistedWorkflow } from '../../types/persistence'
import type { WorkflowNode } from '../../types/workflow'
import { executeNodeByType, type ExecutionLog } from './registry'

export type ExecutionResult = {
	logs: ExecutionLog[]
}

function findStartNode(wf: PersistedWorkflow): WorkflowNode | null {
	const n = wf.nodes.find(n => n.base.type === 'inputText')
	return n ? (n.base as unknown as WorkflowNode) : null
}

export function executeWorkflow(wf: PersistedWorkflow, initialInput?: Record<string, unknown>): ExecutionResult {
	const start = findStartNode(wf)
	if (!start) return { logs: [] }
	const out = new Map<string, Array<{ targetId: string; sourceHandleId?: string }>>()
	for (const e of wf.edges) {
		const arr = out.get(e.sourceId) ?? []
		arr.push({ targetId: e.targetId, sourceHandleId: e.sourceHandleId })
		out.set(e.sourceId, arr)
	}
	const nodeById = new Map(wf.nodes.map(n => [n.id, n.base]))

	const logs: ExecutionResult['logs'] = []
	let payload: Record<string, unknown> = initialInput ?? {}
	const visited = new Set<string>()
	const stack: string[] = [start.id]
	while (stack.length) {
		const curId = stack.pop()!
		if (visited.has(curId)) continue
		visited.add(curId)
		const node = nodeById.get(curId) as unknown as WorkflowNode | undefined
		if (!node) continue
		const { logs: nodeLogs, allowedSourceHandles } = executeNodeByType(node.type, node as WorkflowNode, payload)
		logs.push(...(nodeLogs ?? []))
		for (const edge of out.get(curId) ?? []) {
			if (!allowedSourceHandles || !edge.sourceHandleId || allowedSourceHandles.has(edge.sourceHandleId)) {
				stack.push(edge.targetId)
			}
		}
	}
	return { logs }
} 